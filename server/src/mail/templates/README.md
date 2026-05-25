# Email templates

Each notification uses **three files** sharing the same basename as `EmailTemplateKey` in `mail.types.ts`:

| File | Purpose |
|------|---------|
| `{key}.subject.hbs` | Email subject (one line, Handlebars) |
| `{key}.html.hbs` | HTML body |
| `{key}.text.hbs` | Plain-text fallback |

## Templates

| Key | When it is sent |
|-----|-----------------|
| `creator-profile-approved` | Admin approves creator profile |
| `creator-profile-rejected` | Admin rejects creator profile (regret notice; no CTA) |
| `order-brief-submitted-for-creator` | Brand submits brief (first creator order mail) |
| `order-brief-accepted-for-brand` | Creator accepts brief |
| `order-product-shipped-for-creator` | Brand marks product shipped |
| `order-product-received-for-brand` | Creator confirms product received |
| `order-revision-requested-for-creator` | Brand requests a revision on delivered content |
| `order-content-accepted-for-creator` | Brand accepts delivery (content approved) |
| `order-rejected-for-brand` | Admin marks order rejected — sent to brand |
| `order-rejected-for-creator` | Admin marks order rejected — sent to creator |
| `order-refunded-for-brand` | Payment refunded to brand (order `REFUNDED`) |

## Common variables

Pass these from your notifier / `MailService.send` context:

- `platformName` — e.g. "UGC Platform"
- `recipientName` — display name
- `actionUrl` — primary CTA link (dashboard or order)

## Per-template variables

See comments at the top of each `.html.hbs` file.

Handlebars helpers: use `{{#if var}}...{{/if}}` for optional blocks (e.g. `rejectionReason`, `trackingId`).

**CTA buttons:** use the `actionButton` partial (not a plain link):

```handlebars
{{> actionButton url=actionUrl label="View order"}}
```
