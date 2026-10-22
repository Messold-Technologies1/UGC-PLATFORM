# New AWS account: S3 + CloudFront setup

Phase 1 of moving media storage to a separate AWS account: build the empty
destination. The data copy and cutover are phase 2.

Everything here is additive in a new account. Nothing touches production until
phase 2, with one exception — §1, which revokes a stale permission in the **old**
account and should be done first.

## Known values

| | |
|---|---|
| Old account | `323668150512` (Messold Parallels) |
| Old bucket | `ugc-uploads-323668150512-ap-south-1-an` |
| Region | `ap-south-1` (Mumbai) — the new bucket **must** match |
| New account | already created |
| Current CDN | a raw `*.cloudfront.net` hostname |

Because the current CDN is a raw CloudFront hostname, cutover **must** rewrite
stored URLs in the database — there is no DNS record to move. See §8 for why that
makes this the right moment to adopt a custom domain.

---

## 0. Prerequisites

### 0a. A CLI profile for the new account

Every command below uses `--profile ugc-new`. Create an admin access key in the
new account (IAM → Users → your admin user → Security credentials), then:

```bash
aws configure --profile ugc-new
# AWS Access Key ID:     <new account admin key>
# AWS Secret Access Key: <new account admin secret>
# Default region name:   ap-south-1
# Default output format: json
```

Verify you are in the **new** account before doing anything else:

```bash
aws sts get-caller-identity --profile ugc-new
```

The `Account` field must NOT be `323668150512`. If it is, you are pointed at the
old account and every command below would hit production.

### 0b. Variables

```bash
export P="--profile ugc-new"
export REGION=ap-south-1
export NEW_ACCOUNT=$(aws sts get-caller-identity $P --query Account --output text)
export NEW_BUCKET="ugc-uploads-${NEW_ACCOUNT}-ap-south-1"
export OLD_BUCKET=ugc-uploads-323668150512-ap-south-1-an
export OLD_ACCOUNT=323668150512
export APP_ORIGIN=https://app.yourdomain.com      # ← your real frontend origin
export CDN_DOMAIN=cdn.yourdomain.com              # ← see §8

echo "new account: $NEW_ACCOUNT / bucket: $NEW_BUCKET"
```

> Do not reuse the old bucket's name. S3 names are globally unique, and the old
> one embeds `323668150512` — carrying that into the new account is confusing
> forever. Keys are what the application stores, and those are identical in both
> buckets, so the bucket name does not matter to the app.

---

## 1. First: revoke the stale recovery grant (old account)

The policy `ugc-platform-s3-upload-putobject` in account `323668150512` was
widened on **30 September 2026** so `restore-original-videos.ts` could run. It
still carries those permissions:

```json
{ "Sid": "RecoverListVersions",   "Action": "s3:ListBucketVersions" },
{ "Sid": "RecoverObjectVersions", "Action": ["s3:GetObjectVersion",
                                             "s3:DeleteObjectVersion"] }
```

That policy is attached to the credentials the running application holds.
`s3:DeleteObjectVersion` is the only S3 call that destroys bytes irreversibly —
an ordinary `DeleteObject` on a versioned bucket just writes a delete marker,
which is precisely why the full-resolution originals were recoverable at all.

The application never issues these calls. Verified:

```
ListObjectVersionsCommand → server/src/scripts/restore-original-videos.ts only
Runtime services using version APIs → none
```

**Edit the policy in the old account and delete both `Recover*` statements**,
keeping `AllowObjectOps` and `AllowListBucket` as they are. IAM retains the prior
version, so rollback is one click. No redeploy needed — nothing in the running
app uses those actions.

When a recovery script next needs to run, put the `Recover*` statements in a
**separate** policy, attach it for the run, detach it after.

---

## 2. Create the bucket

```bash
aws s3api create-bucket $P \
  --bucket "$NEW_BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"
```

## 3. Block all public access

The bucket is never public. CloudFront reads it with a signed request; uploads
use presigned URLs. Both are authenticated.

```bash
aws s3api put-public-access-block $P \
  --bucket "$NEW_BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

> This does not break presigned uploads. A presigned PUT carries a SigV4
> signature, so S3 treats it as authenticated, not public. If uploads fail later,
> the cause is CORS (§6) — never disable this to "fix" it.

## 4. Disable ACLs

```bash
aws s3api put-bucket-ownership-controls $P \
  --bucket "$NEW_BUCKET" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
```

This guarantees the new account owns every object copied in from the old one
during phase 2.

## 5. Versioning + lifecycle, together

Versioning is worth keeping — it is what made the originals recoverable.
Versioning **without expiry** is what inflated the bill. Apply both now; never
leave a gap.

```bash
aws s3api put-bucket-versioning $P \
  --bucket "$NEW_BUCKET" \
  --versioning-configuration Status=Enabled
```

`lifecycle.json`:

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
    { "ID": "tmp-agency-logo",            "Status": "Enabled", "Filter": { "Prefix": "agency-logo-temp/" },                 "Expiration": { "Days": 7 } },
    { "ID": "tmp-agency-logo-signup",     "Status": "Enabled", "Filter": { "Prefix": "agency-logo-signup-temp/" },          "Expiration": { "Days": 7 } },
    { "ID": "tmp-brand-logo",             "Status": "Enabled", "Filter": { "Prefix": "brand-logo-temp/" },                  "Expiration": { "Days": 7 } },
    { "ID": "tmp-brand-logo-signup",      "Status": "Enabled", "Filter": { "Prefix": "brand-logo-signup-temp/" },           "Expiration": { "Days": 7 } },
    { "ID": "tmp-brand-pronunciation",    "Status": "Enabled", "Filter": { "Prefix": "brand-pronunciation-temp/" },         "Expiration": { "Days": 7 } },
    { "ID": "tmp-brand-pron-signup",      "Status": "Enabled", "Filter": { "Prefix": "brand-pronunciation-signup-temp/" },  "Expiration": { "Days": 7 } },
    { "ID": "tmp-brief-product",          "Status": "Enabled", "Filter": { "Prefix": "brief-product-temp/" },               "Expiration": { "Days": 7 } },
    { "ID": "tmp-creator-portfolio-signup","Status": "Enabled","Filter": { "Prefix": "creator-portfolio-signup-temp/" },    "Expiration": { "Days": 7 } }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration $P \
  --bucket "$NEW_BUCKET" --lifecycle-configuration file://lifecycle.json

aws s3api get-bucket-lifecycle-configuration $P --bucket "$NEW_BUCKET"
```

The eight temp prefixes are from `server/src/storage/storage.service.ts`. They
expire at **7 days, not 1**: a temp object becomes permanent only when the
matching `finalize*` call copies it, and a creator who uploads during signup and
finishes the wizard two days later still needs the file. These are small objects;
a shorter window risks deleting real uploads to save pennies.

The permanent prefixes — `creator-portfolio/`, `creator-profile/`,
`order-deliveries/`, `creator-demo-videos/`, `order-chat-voice/`, `brand-logo/`,
`agency-logo/`, `brief-product/`, `brand-pronunciation/` — get **no** expiry
rule. Leave everything in S3 Standard; Glacier/IA transitions are a false economy
for media served through a CDN.

> These rules are safe here because the bucket is empty. Do **not** paste
> `NoncurrentVersionExpiration` onto the old bucket until a dry run of
> `restore-original-videos.ts` reports 0 remaining — on a bucket with history it
> permanently deletes the versions that script recovers from.

## 6. CORS — the one that silently breaks large uploads

Browsers PUT directly to S3 via presigned URLs, so the **bucket** needs CORS.
CloudFront is not in the upload path.

`cors.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://app.yourdomain.com",
        "http://localhost:3000"
      ],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

```bash
aws s3api put-bucket-cors $P --bucket "$NEW_BUCKET" --cors-configuration file://cors.json
```

**`ExposeHeaders: ["ETag"]` is mandatory.** The uploader reads each part's ETag
to complete a multipart upload, and says so at
`client/lib/s3-multipart-upload.ts:61-67`:

> `Part N succeeded but no ETag was returned — check the S3 bucket CORS
> "ExposeHeaders" includes "ETag".`

Omit it and small images upload fine while **every large video fails** — it
passes a casual smoke test and breaks in production. List every origin that
uploads: production, staging, and localhost if developers upload locally.

## 7. IAM: application user

Scoped to the SDK commands `server/src/` actually issues.

```bash
aws iam create-user $P --user-name ugc-platform-app
```

`app-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowObjectOps",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": "arn:aws:s3:::BUCKET/*"
    },
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:ListBucketMultipartUploads"],
      "Resource": "arn:aws:s3:::BUCKET"
    }
  ]
}
```

```bash
sed -i.bak "s/BUCKET/$NEW_BUCKET/g" app-policy.json
aws iam put-user-policy $P --user-name ugc-platform-app \
  --policy-name ugc-platform-s3 --policy-document file://app-policy.json
aws iam create-access-key $P --user-name ugc-platform-app
```

Store the key pair in your secret manager; they become `AWS_S3_ACCESS_KEY_ID` /
`AWS_S3_SECRET_ACCESS_KEY` at cutover.

Notes on the shape:

- `CopyObject` (`finalizeCreatorPortfolioVideoFromTempKey`,
  `copyOrderAssetToPortfolio`) needs `GetObject` on source and `PutObject` on
  destination — both in-bucket, so `/*` covers it.
- `CreateMultipartUpload`, `UploadPart` and `CompleteMultipartUpload` all
  authorize against `s3:PutObject`; there are no separate IAM actions.
- **No version permissions**, deliberately — see §1.

## 8. CloudFront

### 8a. Adopt a custom domain

The current CDN is a raw `*.cloudfront.net`, so cutover rewrites stored URLs in
the database no matter what. That work is identical whether the new value is
another `*.cloudfront.net` or `cdn.yourdomain.com` — so point it at a domain you
own and this becomes the **last** URL rewrite this project needs. Every future
bucket or CDN change is then a DNS record.

Certificate first. **ACM certs for CloudFront must be in `us-east-1`**,
regardless of the bucket's region:

```bash
aws acm request-certificate --profile ugc-new --region us-east-1 \
  --domain-name "$CDN_DOMAIN" --validation-method DNS
```

Add the CNAME validation record ACM returns, and wait for status `ISSUED`.

### 8b. Distribution

Console → CloudFront → Create distribution:

**Origin**
- Origin domain: select `<bucket>.s3.ap-south-1.amazonaws.com` from the dropdown.
  Do **not** type the `s3-website-` form — that requires a public bucket.
- Origin access: **Origin access control settings (recommended)** → create an OAC
  → select it
- CloudFront shows a **Copy policy** button — copy it, you need it below

**Default cache behavior**
- Viewer protocol policy: Redirect HTTP to HTTPS
- Allowed methods: **GET, HEAD** (uploads bypass CloudFront)
- Cache policy: **CachingOptimized**
- Compress objects automatically: Yes

**Settings**
- Price class: **Use all edge locations** — the cheaper tiers exclude Indian
  edges, which is where your traffic is
- Alternate domain name: `cdn.yourdomain.com`
- Custom SSL certificate: the one from §8a

Then apply the copied policy to the bucket:

```bash
aws s3api put-bucket-policy $P --bucket "$NEW_BUCKET" --policy file://oac-policy.json
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::NEW_ACCOUNT:distribution/DIST_ID"
        }
      }
    }
  ]
}
```

Without this the distribution returns 403 on everything.

### 8c. Video playback

Nothing to configure. CloudFront forwards HTTP range requests on GET/HEAD by
default, which is what lets players seek. Your pipeline already writes
`+faststart` MP4s (`preview-video.service.ts:170`). Do not add a header-forwarding
policy — it destroys the cache hit rate and pushes traffic back to origin.

### 8d. DNS

Point `cdn.yourdomain.com` at the new distribution now. Nothing references it
until cutover, so this is safe to do early and lets you test end to end.

## 9. IAM: migration user (phase 2 prep)

In the **new** account:

```bash
aws iam create-user $P --user-name ugc-platform-migration
```

`migration-policy.json` — read old, write new:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetObject"],
      "Resource": [
        "arn:aws:s3:::ugc-uploads-323668150512-ap-south-1-an",
        "arn:aws:s3:::ugc-uploads-323668150512-ap-south-1-an/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:PutObject"],
      "Resource": ["arn:aws:s3:::BUCKET", "arn:aws:s3:::BUCKET/*"]
    }
  ]
}
```

In the **old** account, add to the bucket policy:

```json
{
  "Sid": "AllowNewAccountMigrationRead",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::NEW_ACCOUNT:user/ugc-platform-migration" },
  "Action": ["s3:ListBucket", "s3:GetObject"],
  "Resource": [
    "arn:aws:s3:::ugc-uploads-323668150512-ap-south-1-an",
    "arn:aws:s3:::ugc-uploads-323668150512-ap-south-1-an/*"
  ]
}
```

Note this grants **read only** — no `GetObjectVersion`. `aws s3 sync` copies
current versions, which is exactly what you want: the version bloat stays behind
in the old bucket and is never carried across.

Pulling with new-account credentials (rather than pushing from the old account)
is what makes the new account the owner of every copied object. Delete this user
the day the migration completes.

## 10. Budget guardrails

Billing → Budgets → Create budget in the new account:

- Monthly cost budget, e.g. `$25`
- Three alerts: **actual > 50%**, **actual > 90%**, and **forecasted > 100%**
- Recipients: a list more than one person reads

The forecasted alert is the one that matters — it fires on day 2 of a runaway,
while it is still cheap to stop. Enable Cost Explorer at the same time; it needs
~24h to populate.

## 11. Verify before phase 2

```bash
echo hello > test.txt
aws s3 cp $P test.txt "s3://$NEW_BUCKET/test.txt"

# direct S3 must FAIL (403)
curl -I "https://$NEW_BUCKET.s3.$REGION.amazonaws.com/test.txt"

# through CloudFront must SUCCEED (200)
curl -I "https://$CDN_DOMAIN/test.txt"

aws s3 rm $P "s3://$NEW_BUCKET/test.txt"
```

- [ ] `sts get-caller-identity` shows the new account, not `323668150512`
- [ ] Old account: `Recover*` statements removed (§1)
- [ ] Bucket region is `ap-south-1`
- [ ] Block Public Access: all four `true`
- [ ] Object Ownership: `BucketOwnerEnforced`
- [ ] Versioning on **and** lifecycle applied — confirmed by reading it back
- [ ] CORS exposes `ETag`, lists every uploading origin
- [ ] App IAM user has no version permissions
- [ ] Bucket policy holds only the OAC statement and the migration grant
- [ ] Direct S3 403, CloudFront 200
- [ ] ACM cert `ISSUED` in `us-east-1`, attached, custom domain resolving
- [ ] Budget with a forecasted alert

---

## Code changes needed before cutover

**`AWS_REGION` is shared by S3 and SES** (`server/src/config/env.validation.ts:121`,
consumed by `storage.service.ts:132` and `ses-mail.transport.ts:38`). Keeping the
new bucket in `ap-south-1` sidesteps this — but only as long as SES stays there
too. Adding an optional `S3_REGION` that falls back to `AWS_REGION` removes the
coupling permanently.

**`server/.env.example:35-36`** names `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
while validation requires `AWS_S3_ACCESS_KEY_ID` / `AWS_S3_SECRET_ACCESS_KEY`.
Fix before anyone provisions from it.

**URL rewrite script** (phase 2). Because the current CDN is a raw
`*.cloudfront.net`, cutover must rewrite stored absolute URLs:

```
CreatorProfile         introVideoUrl, previewVideoUrl, profileImageUrl
CreatorPortfolioVideo  videoUrl, thumbnailUrl
CreatorDemoVideo       videoUrl, thumbnailUrl
Brief                  brandLogoUrl, productImageUrl, brandPronunciationAudioUrl
BrandProfile           logoUrl, brandPronunciationAudioUrl
Agency                 logoUrl
OrderDelivery          assets   ← JSON: url + previewUrl per asset
```

Object keys are unchanged, so this is a hostname substring swap — except
`OrderDelivery.assets`, which needs a JSON-aware update
(`watermark.service.ts:231-241`). Scan every text/JSON column for the old
hostname before declaring it done rather than trusting this list.
