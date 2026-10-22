# New AWS account: S3 + CloudFront setup

Phase 1 of moving media storage to a separate AWS account. This document covers
**building the empty destination** — account, bucket, policies, IAM, CDN. It does
not copy data or cut over; that is phase 2.

Nothing here touches production. Every step is additive in a brand-new account,
so it is safe to work through at your own pace and verify as you go.

---

## 0. Decisions to make before you start

| Decision | Recommendation | Why |
|---|---|---|
| Region for the new bucket | **Same region as the current bucket** | Cross-account copy inside one region is free. Cross-region means paying egress on the old account for the whole migration. |
| CDN hostname | **Keep your existing custom domain** | Moving the DNS record to the new distribution means zero database rows change at cutover, and rollback is a DNS change. |
| App credentials | IAM user + access keys | `StorageService` reads `AWS_S3_ACCESS_KEY_ID` / `AWS_S3_SECRET_ACCESS_KEY` via `getOrThrow` (`server/src/storage/storage.service.ts:132-137`). It has no role-assumption path today. |

Set these once and reuse them in every command below:

```bash
export NEW_BUCKET=ugc-platform-media            # must be globally unique
export REGION=ap-south-1                        # MUST match the current bucket's region
export CDN_DOMAIN=cdn.yourdomain.com            # your existing CDN hostname
export APP_ORIGIN=https://app.yourdomain.com    # the frontend origin that uploads
```

> Confirm the current region before setting `REGION`:
> `aws s3api get-bucket-location --bucket OLD-BUCKET` (a `null` result means `us-east-1`).

---

## 1. Create the account

Prefer **AWS Organizations** over a standalone signup. A member account needs no
separate card, bills to the same payer, and can be closed from the console later.

From the **existing** account (the one that owns the org, or create an org first):

1. AWS Organizations → **Add an AWS account** → **Create an AWS account**
2. Account name: something explicit, e.g. `ugc-platform-media`
3. Email: must be globally unique across all of AWS. Use a plus-address on a
   distribution list you control — `aws+ugcmedia@yourdomain.com`. **Never a
   personal mailbox**; this address owns the account and is how you recover it.
4. IAM role name: leave the default `OrganizationAccountAccessRole`. This is how
   you get in without a root password.

Account creation takes a few minutes.

### Secure it immediately

The new account's root user has no password until you set one. Before anything
else:

1. **Root password**: Sign in with the account email → "Forgot password" → set a
   strong unique password. Store it in your password manager.
2. **Root MFA**: IAM → root user → assign an MFA device. Non-negotiable — a root
   user without MFA and with billing attached is the single worst AWS exposure.
3. **No root access keys.** If any exist, delete them. Root should never have
   programmatic credentials.
4. **Billing contact + alternate contacts**: Account settings → add a billing
   email that more than one person reads.

You access the account day to day by switching roles from the parent account
(`OrganizationAccountAccessRole`), not by logging in as root.

---

## 2. Budget guardrails (do this now, not later)

Given what prompted this migration, set the alarm **before** there is anything to
alarm about.

Billing and Cost Management → **Budgets** → Create budget:

- Type: **Cost budget**, Monthly, Recurring
- Amount: your expected steady-state plus headroom (e.g. `$25`)
- Alerts — create **three**, not one:
  - **Actual** > 50% of budget
  - **Actual** > 90% of budget
  - **Forecasted** > 100% of budget ← this is the one that catches a runaway
    script on day 2 of the month, while it is still cheap to stop
- Recipients: the billing distribution list, not one person

Also enable **Cost Explorer** (Billing → Cost Explorer → Enable). It takes ~24h
to populate, so turning it on now means it is ready when you need it.

Optionally enable **S3 Storage Lens** (free tier) — it surfaces noncurrent
version bloat and incomplete multipart uploads on a dashboard, which is exactly
the class of problem that drove this migration.

---

## 3. Create the bucket

```bash
aws s3api create-bucket \
  --bucket "$NEW_BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"
```

> `us-east-1` is the exception — omit `--create-bucket-configuration` entirely there.

### 3a. Block all public access

The bucket is **never** public. CloudFront reads it with a signed request, and
uploads use presigned URLs — both are authenticated, so neither needs public
access.

```bash
aws s3api put-public-access-block \
  --bucket "$NEW_BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

> **This does not break presigned uploads.** A presigned PUT carries a SigV4
> signature of your IAM user, so S3 treats it as an authenticated request, not
> public access. People disable Block Public Access to "fix" upload problems and
> expose the whole bucket; the real cause is almost always CORS (§3d).

### 3b. Disable ACLs

```bash
aws s3api put-bucket-ownership-controls \
  --bucket "$NEW_BUCKET" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
```

`BucketOwnerEnforced` is the default for new buckets, but set it explicitly — it
guarantees that objects copied **from the old account** during migration are owned
by this account. Without it you can end up with objects you cannot read from the
bucket you own.

### 3c. Versioning on, with lifecycle from day one

Versioning is genuinely useful — it is what made the full-resolution originals
recoverable. The failure mode last time was versioning **without** expiry. Enable
both together, in that order, and never leave a gap between them.

```bash
aws s3api put-bucket-versioning \
  --bucket "$NEW_BUCKET" \
  --versioning-configuration Status=Enabled
```

Save as `lifecycle.json`:

```json
{
  "Rules": [
    {
      "ID": "expire-noncurrent-versions",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    },
    {
      "ID": "expire-delete-markers",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Expiration": { "ExpiredObjectDeleteMarker": true }
    },
    {
      "ID": "abort-incomplete-multipart",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    },
    {
      "ID": "expire-temp-uploads",
      "Status": "Enabled",
      "Filter": {
        "Or": {
          "Prefix": "",
          "Tags": []
        }
      },
      "Expiration": { "Days": 7 }
    }
  ]
}
```

> The fourth rule above is a placeholder — a single rule cannot match multiple
> prefixes. Replace it with one rule per temp prefix, listed below.

The temp prefixes, taken from `server/src/storage/storage.service.ts`:

```
agency-logo-temp/                     agency-logo-signup-temp/
brand-logo-temp/                      brand-logo-signup-temp/
brand-pronunciation-temp/             brand-pronunciation-signup-temp/
brief-product-temp/                   creator-portfolio-signup-temp/
```

Each needs its own rule:

```json
{
  "ID": "expire-temp-creator-portfolio-signup",
  "Status": "Enabled",
  "Filter": { "Prefix": "creator-portfolio-signup-temp/" },
  "Expiration": { "Days": 7 }
}
```

**Why 7 days and not 1.** A temp object becomes permanent only when the matching
`finalize*` call copies it (`storage.service.ts:421`+). A creator who uploads a
portfolio video during signup and finishes the wizard two days later still needs
that object. Seven days is comfortably past any realistic abandon-and-return, and
these are small objects — the saving from a shorter window is not worth deleting
a real user's upload. Do **not** apply these rules to the permanent prefixes
(`creator-portfolio/`, `creator-profile/`, `order-deliveries/`, etc.).

Apply:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$NEW_BUCKET" \
  --lifecycle-configuration file://lifecycle.json

# verify
aws s3api get-bucket-lifecycle-configuration --bucket "$NEW_BUCKET"
```

> Leave everything in S3 Standard. Do not add Glacier or IA transitions for media
> served through CloudFront — retrieval latency and per-GB retrieval fees make it
> a false economy for assets that are actively played.

### 3d. CORS — the one that silently breaks large uploads

Browsers PUT directly to S3 using presigned URLs, so the **bucket** needs CORS
(CloudFront is not in that path). Save as `cors.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://app.yourdomain.com"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

```bash
aws s3api put-bucket-cors --bucket "$NEW_BUCKET" --cors-configuration file://cors.json
```

**`ExposeHeaders: ["ETag"]` is mandatory.** The browser uploader reads the
per-part ETag to complete a multipart upload, and the code says so explicitly at
`client/lib/s3-multipart-upload.ts:61-67`:

> `Part N succeeded but no ETag was returned — check the S3 bucket CORS
> "ExposeHeaders" includes "ETag".`

Omit it and **small images upload fine while every large video fails** — so it
passes a casual smoke test and breaks in production. This is the single most
common way a bucket migration goes wrong.

List every origin that uploads: production, staging, and `http://localhost:3000`
if developers upload from local.

---

## 4. IAM user for the application

Scoped to exactly the operations the code performs. Derived from the AWS SDK
commands in `server/src/` — `PutObject`, `GetObject`, `DeleteObject`,
`CopyObject`, and the four multipart commands.

```bash
aws iam create-user --user-name ugc-platform-app
```

Save as `app-policy.json` (substitute your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": "arn:aws:s3:::ugc-platform-media/*"
    },
    {
      "Sid": "BucketListing",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:ListBucketMultipartUploads"],
      "Resource": "arn:aws:s3:::ugc-platform-media"
    }
  ]
}
```

```bash
aws iam put-user-policy \
  --user-name ugc-platform-app \
  --policy-name ugc-platform-s3 \
  --policy-document file://app-policy.json

aws iam create-access-key --user-name ugc-platform-app
```

Store the key and secret straight into your secret manager. They become
`AWS_S3_ACCESS_KEY_ID` / `AWS_S3_SECRET_ACCESS_KEY` at cutover.

**Notes on the policy shape:**

- `CopyObject` (used by `finalizeCreatorPortfolioVideoFromTempKey` and
  `copyOrderAssetToPortfolio`) needs `GetObject` on the source and `PutObject` on
  the destination. Both are in-bucket here, so the single `/*` resource covers it.
- `CreateMultipartUpload`, `UploadPart`, and `CompleteMultipartUpload` all
  authorize against `s3:PutObject` — there are no separate IAM actions.
- **No versioning permissions.** `s3:ListBucketVersions`,
  `s3:GetObjectVersion`, and `s3:DeleteObjectVersion` are deliberately absent.
  The running app never touches versions; only the maintenance scripts do. Grant
  those to a **separate** user you use only when running a script, so an
  application bug can never reach through version history. That separation is
  worth having given how the last incident unfolded.

---

## 5. IAM for the migration copy (phase 2 prep)

Create this now so phase 2 is just running a command.

**In the new account** — a user that can read the old bucket and write the new one:

```bash
aws iam create-user --user-name ugc-platform-migration
```

`migration-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetObject", "s3:GetObjectVersion"],
      "Resource": [
        "arn:aws:s3:::OLD-BUCKET",
        "arn:aws:s3:::OLD-BUCKET/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:PutObject"],
      "Resource": [
        "arn:aws:s3:::ugc-platform-media",
        "arn:aws:s3:::ugc-platform-media/*"
      ]
    }
  ]
}
```

**In the old account** — a bucket policy granting that user read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowNewAccountMigrationRead",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::NEW-ACCOUNT-ID:user/ugc-platform-migration"
      },
      "Action": ["s3:ListBucket", "s3:GetObject", "s3:GetObjectVersion"],
      "Resource": [
        "arn:aws:s3:::OLD-BUCKET",
        "arn:aws:s3:::OLD-BUCKET/*"
      ]
    }
  ]
}
```

Pulling with new-account credentials (rather than pushing from the old account)
is what makes the new account the owner of every copied object.

Delete this user the day the migration completes.

---

## 6. CloudFront distribution

### 6a. Origin Access Control

OAC lets CloudFront sign its requests to a fully private bucket. It replaces the
older Origin Access Identity; use OAC for anything new.

Console → CloudFront → **Create distribution**:

**Origin**
- Origin domain: pick `ugc-platform-media.s3.ap-south-1.amazonaws.com` from the
  dropdown. **Do not** type the website-endpoint form (`...s3-website-...`) —
  that one requires a public bucket.
- Origin access: **Origin access control settings (recommended)** → Create new OAC
  → accept defaults → select it
- CloudFront will show **"Copy policy"** — copy it. You must apply it to the
  bucket or every request returns 403.

**Default cache behavior**
- Viewer protocol policy: **Redirect HTTP to HTTPS**
- Allowed methods: **GET, HEAD** (uploads bypass CloudFront entirely)
- Cache policy: **CachingOptimized**
- Compress objects automatically: **Yes**

**Settings**
- Price class: **Use only North America and Europe** is cheapest, but if your
  audience is primarily in India choose **Use all edge locations** — Indian edges
  are not in the restricted sets.
- Alternate domain name (CNAME): `cdn.yourdomain.com`
- Custom SSL certificate: see §6c

Create it, then apply the copied policy to the bucket:

```bash
aws s3api put-bucket-policy --bucket "$NEW_BUCKET" --policy file://oac-policy.json
```

It looks like this — note the `AWS:SourceArn` condition, which scopes access to
your one distribution:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ugc-platform-media/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::NEW-ACCOUNT-ID:distribution/DISTRIBUTION-ID"
        }
      }
    }
  ]
}
```

That policy plus the migration grant are the **only** two statements the bucket
policy should ever contain.

### 6b. Video playback

Nothing to configure — CloudFront forwards HTTP range requests on GET/HEAD by
default, which is what lets the player seek without downloading the whole file.
Your pipeline already writes `+faststart` MP4s (`preview-video.service.ts:170`),
so playback starts after the first few KB.

Do **not** add a `Cache-Control`-stripping policy or forward all headers; it
wrecks the cache hit rate and sends traffic back to the origin.

### 6c. Certificate — must be in us-east-1

**ACM certificates for CloudFront must live in `us-east-1`, regardless of where
your bucket is.** This catches almost everyone.

```bash
aws acm request-certificate \
  --domain-name "$CDN_DOMAIN" \
  --validation-method DNS \
  --region us-east-1
```

Add the CNAME validation record ACM gives you to your DNS, wait for **Issued**,
then attach it to the distribution as the custom SSL certificate.

### 6d. DNS

Until you are ready to cut over, point a **temporary** hostname at the new
distribution (e.g. `cdn-new.yourdomain.com`) so you can test end to end without
touching production. Moving the real `cdn.yourdomain.com` record is a phase-2
cutover step — and the thing that lets you skip rewriting database URLs entirely.

---

## 7. Verify before phase 2

```bash
# Upload a test object
echo "hello" > test.txt
aws s3 cp test.txt "s3://$NEW_BUCKET/test.txt"

# Direct S3 access must FAIL (403) — the bucket is private
curl -I "https://$NEW_BUCKET.s3.$REGION.amazonaws.com/test.txt"

# Through CloudFront must SUCCEED (200)
curl -I "https://cdn-new.yourdomain.com/test.txt"

aws s3 rm "s3://$NEW_BUCKET/test.txt"
```

Checklist:

- [ ] Root MFA enabled, no root access keys
- [ ] Budget with **forecasted** alert, to a list more than one person reads
- [ ] Bucket region matches the old bucket exactly
- [ ] Block Public Access: all four settings `true`
- [ ] Object Ownership: `BucketOwnerEnforced`
- [ ] Versioning enabled **and** lifecycle applied — verified with `get-bucket-lifecycle-configuration`
- [ ] CORS includes `ExposeHeaders: ["ETag"]` and every uploading origin
- [ ] App IAM user has no version-level permissions
- [ ] Bucket policy contains only the OAC statement and the migration grant
- [ ] Direct S3 URL returns 403, CloudFront URL returns 200
- [ ] ACM certificate issued in `us-east-1` and attached

---

## Known code change required before cutover

`AWS_REGION` is a single variable shared by S3 and SES
(`server/src/config/env.validation.ts:121`), consumed by both
`storage.service.ts:132` and `ses-mail.transport.ts:38`.

If the new bucket's region differs from your SES region, this cannot be
expressed in configuration today. Either keep the bucket in the same region as
SES (which you want anyway, for free same-region migration transfer), or add an
optional `S3_REGION` that falls back to `AWS_REGION`.

Separately, `server/.env.example:35-36` names `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` while validation requires `AWS_S3_ACCESS_KEY_ID` /
`AWS_S3_SECRET_ACCESS_KEY`. Worth fixing before anyone provisions from it.
