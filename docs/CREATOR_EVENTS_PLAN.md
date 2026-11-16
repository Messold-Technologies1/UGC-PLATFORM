# Creator Events — implementation plan

A creator writes a short line about what they have going on — travelling, a
wedding, a new studio, a week off. Brands read all of it as one chronological
feed, and can open the creator's profile from any post.

Status: **planned, not started.** Design canvas:
`https://claude.ai/artifact/FGcHNC3SoYB7isDkoXUK7n` (private — share from the
page's Share menu before sending it on).

---

## 1. Decisions (agreed before design)

| # | Decision | Chosen |
|---|---|---|
| 1 | What a post contains | **Free text only.** No dates, no location field, no media. The timestamp is automatic. |
| 2 | Who sees it | **Every brand, in the feed.** Nothing is added to the public profile page — it already exists and already has everything; the feed card's profile link is the whole connection. |
| 3 | What a brand can do with a post | **Read it and open the creator's profile.** No likes, comments or per-post message button. |
| 4 | Link to `CreatorUnavailability` | **None.** Posting never changes a creator's bookable dates. A creator can say "I'm on a break" in words without accidentally blocking bookings. |
| 5 | Edit / delete | **Both, anytime.** An edited post carries a small `edited` marker. |
| 6 | Moderation | **Publish instantly; admin can hide.** Hiding is reversible and never deletes. |
| 7 | Brand entry point | **New `Events` item in the top nav**, at `/brand/events`. |
| 8 | Feed ordering | **Newest first, no filters, no search.** Infinite scroll. |
| 9 | Page headings | **None.** The nav already says Events; neither page carries an `<h1>` + subheading block. |

---

## 2. The constraint that shapes every screen

`creator-profile.service.ts` maps every brand-facing and public response to
`name: profile.publicSlug` — *"Brands see the opaque public slug, never the
creator's real name."*

Two consequences:

1. **A feed card shows `publicSlug` + `profileImageUrl`, never `displayName`.**
   The feed mapper must reuse the existing creator mapper rather than selecting
   `displayName` itself, or this feature becomes the one hole in the anonymity
   model.
2. **Free text is the one field a creator can type their own name or phone
   number into.** That is the actual argument for the admin Hide action — not
   profanity. The composer says so in plain words, and the admin table's first
   example row is exactly this case.

---

## 3. Data model

One new model. New section in `server/prisma/schema.prisma`, plus a relation
field on `CreatorProfile` and on `User`.

```prisma
/// A creator's short free-text status post — "travelling to Jaipur this week",
/// "set up a home studio", "off sick until Monday". Deliberately text-only:
/// no media, no date range, no reactions. Brands read these as one
/// chronological feed. Carries no availability meaning — a creator saying they
/// are on a break here does NOT touch CreatorUnavailability, which stays the
/// one explicit place bookable dates are set.
model CreatorEvent {
  id        String @id @default(uuid()) @db.Uuid
  creatorId String @db.Uuid

  /// The whole post. 1–500 characters after trimming. Newlines are kept and
  /// the client renders with `white-space: pre-line`; everything else is
  /// plain text, escaped at render. No HTML, no markdown, no autolinking.
  body String @db.VarChar(500)

  /// Set the first time the body changes, so the card can show "edited".
  /// Null means never edited. Distinct from `updatedAt`, which also moves
  /// when an admin hides the post.
  editedAt DateTime?

  /// Soft moderation. Non-null removes the post from the brand feed
  /// immediately. The CREATOR still sees it in their own list with a Hidden
  /// banner — nothing silently vanishes on them. Never a hard delete: the row
  /// is the evidence for the decision.
  hiddenAt       DateTime?
  hiddenByUserId String?   @db.Uuid
  hiddenReason   String?   @db.VarChar(200)

  /// Creator-initiated removal. Separate from `hiddenAt` so a creator tidying
  /// up their own feed is never confused with a moderation action in the
  /// admin table or in support conversations.
  deletedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  creator      CreatorProfile @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  hiddenByUser User?          @relation("CreatorEventHiddenBy", fields: [hiddenByUserId], references: [id], onDelete: SetNull)

  /// The creator's own list, newest first.
  @@index([creatorId, createdAt(sort: Desc)])
  /// The brand feed's keyset page: ORDER BY createdAt DESC, id DESC.
  @@index([createdAt(sort: Desc), id(sort: Desc)])
}
```

Add to `CreatorProfile`: `events CreatorEvent[]`.
Add to `User`: `hiddenCreatorEvents CreatorEvent[] @relation("CreatorEventHiddenBy")`.

Migration folder: `server/prisma/migrations/<YYYYMMDDHHMMSS>_creator_events/`,
matching the existing naming (`20261116090000_creator_public_name_reveal`).
No backfill script — there is nothing to backfill.

**Why soft delete.** If a creator deletes a post a brand has just reported,
a hard delete destroys the only record of what was said. `deletedAt` costs one
`WHERE` clause and keeps support able to answer. From the creator's side the
copy still reads "this can't be undone", which remains true for them.

---

## 4. API surface

New Nest module `server/src/creator-events/`, registered in `app.module.ts`
after `WishlistsModule`.

### Creator (own posts)

| Method | Path | Guards |
|---|---|---|
| `GET` | `/api/creator-events/me?cursor=&limit=` | `JwtAuthGuard`, `WorkspacePermissionGuard` + `@RequiredWorkspace('CREATOR')` |
| `POST` | `/api/creator-events` | same |
| `PATCH` | `/api/creator-events/:id` | same |
| `DELETE` | `/api/creator-events/:id` → `204` | same |

`GET /me` returns the creator's own posts **including hidden ones** (flagged),
excluding soft-deleted ones.

A post that is not the caller's returns **404, not 403** — a 403 confirms the
id exists and lets someone enumerate post ids.

### Brand feed

| Method | Path | Guards |
|---|---|---|
| `GET` | `/api/creator-events/feed?cursor=&limit=` | `JwtAuthGuard`, `WorkspacePermissionGuard` + `@RequiredWorkspace('BRAND')` |

Agencies resolve through the same `BRAND` workspace path the wishlists and
briefs controllers already use, so they get the feed without extra work.

Filter: `deletedAt: null`, `hiddenAt: null`, `creator: { isListed: true }` —
the same discovery gate brand browse uses, so an unlisted creator never
surfaces through this side door.

**No public endpoint.** Event posts are visible to signed-in brands and
agencies only.

### Admin

| Method | Path | Guards |
|---|---|---|
| `GET` | `/api/admin/creator-events?status=all\|visible\|hidden&search=&cursor=` | `JwtAuthGuard`, `AdminGuard` |
| `POST` | `/api/admin/creator-events/:id/hide` `{ reason }` | same |
| `POST` | `/api/admin/creator-events/:id/unhide` | same |

`hide` writes `hiddenAt`, `hiddenByUserId` (from the admin's JWT) and
`hiddenReason`. `unhide` clears all three.

### Pagination

Keyset, not offset — a new post arriving mid-scroll must not duplicate a row
onto the next page. Prisma's native cursor does exactly this:

```ts
orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
take: limit + 1,
...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
```

Fetch `limit + 1`, return `limit` items plus `nextCursor = items[limit]?.id`,
or `null` at the end. `limit` defaults to 20, capped at 50.

### Rate limiting

`@Throttle({ default: { limit: 5, ttl: 60_000 } })` on `POST` on top of the
global 100/60s throttler, **plus** a service-level check: no more than 10 posts
per creator per rolling 24 hours. The throttler is per-IP; the service check is
per-creator and is the one that actually stops a feed being flooded.

---

## 5. The feed card reuses the browse payload

A post is text and nothing else, so the card must not pretend otherwise —
there are no images, no video, no portfolio tiles in the feed. What makes it
readable instead is hierarchy and colour:

- **A tinted identity band** across the top of each card, coloured by the
  creator's primary niche (`gc-tint-rose` / `-sky` / `-violet` / `-mint` /
  `-amber`). It holds avatar, slug, niche pill, city, time and the rating
  chip. Scrolling the feed gives a colour rhythm that a wall of white cards
  does not, with nothing invented to fill space.
- **The post text is the hero** — 17px at 1.7 line-height on white, nothing
  competing with it.
- **A credentials footer** — starting price, delivery days, and the
  travel / first-order-free flags, then the `View profile` button.

**None of the supporting data is new.** The brand-facing `Creator` type in
`client/features/creators/types.ts` already has every one of these fields —
`rating`, `reviewCount`, `startingPrice`, `ordersCompleted`, `categories`,
`location`, `deliveryDays`, `travelAvailable`, `onLocationShoot`,
`firstOrderFree`.

So `FeedCreatorEventDto` embeds **the same creator object brand browse already
serializes**, produced by the same mapper. The work is a Prisma `include` plus
reuse, not a new shape:

```ts
{
  id, body, createdAt, editedAt,
  creator: /* existing brand-facing creator mapper output */
}
```

Three notes:

- **The creator mapper is the anonymity boundary.** Reusing it is what keeps
  `displayName` out of this response — see §2.
- **Every supporting field degrades.** A creator with no completed orders gets
  a `New creator` chip instead of a rating; one with no travel add-on simply
  has no travel chip. The third card on the `BrandFeed` artboard shows this.
- **Niche tint is derived on the client** from `categories[0]`, through a small
  lookup to the `gc-tint-*` tokens. Nothing is stored and no migration is
  involved; an unmapped niche falls back to the neutral `gc-surface` band.

---

## 6. Server file layout

```
server/src/creator-events/
├── creator-events.module.ts
├── creator-events.controller.ts        # creator CRUD + brand feed
├── admin-creator-events.controller.ts  # hide / unhide / list
├── creator-events.service.ts
├── creator-event.mapper.ts             # row -> DTO; reuses the creator mapper
│                                       # so publicSlug stays the only identity
├── creator-events.service.spec.ts
├── creator-events.feed.spec.ts
└── dto/
    ├── create-creator-event.dto.ts     # body: trim, @Length(1, 500)
    ├── update-creator-event.dto.ts
    ├── creator-event.dto.ts            # creator's own view (carries `hidden`)
    ├── feed-creator-event.dto.ts       # brand view (embeds `creator`)
    ├── list-creator-events-query.dto.ts
    ├── hide-creator-event.dto.ts
    └── paged-creator-events-response.dto.ts
```

`creator-events.module.ts` imports `AuthModule`, `PrismaModule`,
`BrandAccessModule`, `CreatorProfileModule` — the same set `WishlistsModule`
uses.

---

## 7. Client file layout

```
client/features/creator-events/
├── api/
│   ├── types.ts
│   ├── list-my-events.ts
│   ├── create-event.ts
│   ├── update-event.ts
│   ├── delete-event.ts
│   └── list-event-feed.ts
├── hooks/
│   ├── use-my-events-query.ts
│   ├── use-create-event-mutation.ts    # optimistic insert at the top
│   ├── use-update-event-mutation.ts
│   ├── use-delete-event-mutation.ts
│   └── use-event-feed-infinite-query.ts
└── components/
    ├── event-composer.tsx              # textarea + counter + Post
    ├── my-events-list.tsx
    ├── event-post-card.tsx             # own post: menu, inline edit, hidden banner
    ├── delete-event-dialog.tsx
    ├── event-feed-list.tsx             # infinite scroll + day separators
    ├── event-feed-card.tsx             # brand view (§5)
    └── niche-tint.ts                   # categories[0] -> gc-tint-* token
```

Routes:

- `client/app/creator/(dashboard)/events/page.tsx` + `loading.tsx`
- `client/app/brand/(dashboard)/events/page.tsx` + `loading.tsx`
- `client/app/admin/events/page.tsx`

`client/lib/endpoints.ts` gains a `CREATOR_EVENTS` block mirroring the
`WISHLISTS` shape, with `encodeURIComponent` on every id.

### Navigation

`client/components/navbar/navbar.tsx`:

- **Brand** nav: add `Events` → `/brand/events`, placed second (after
  Creators). The bar is already 7 items wide — check the pill at ~1024px
  before merging; the file already notes the labels squeeze.
- **Agency** nav: the same item → `/agency/events`.
- **Creator** nav: add `Events` → `/creator/events`, and add that href to
  `CREATOR_NAV_GATED_HREFS` so an under-review creator is sent to
  `/creator/under-review` like the other three. A creator who is not listed
  yet has no audience, and letting them post into nothing is worse than
  telling them why.

### Creator page right rail

The creator Events page has no heading, so the rail carries the orientation:
their existing public page link with Copy / View buttons, a small activity card
(post count, time since last post, the 10-a-day ceiling), and three lines of
guidance. All of it is derived from data already on hand — nothing new to
fetch.

---

## 8. Validation, limits and abuse

| Rule | Where |
|---|---|
| Trim, then require 1–500 characters | DTO (`class-validator`) **and** `@db.VarChar(500)` |
| Collapse 3+ consecutive newlines to 2 | service, before write |
| Plain text only — no HTML, no markdown, no autolinking | render as a React text node; nothing to sanitize because nothing is interpreted |
| Max 10 posts per creator per 24h | service |
| 5 POSTs per minute per IP | `@Throttle` |
| Only listed creators can post | service, mirroring the nav gate |
| Composer warns against sharing name / phone / socials | UI copy, always visible under the box |

Optional (flagged, not scheduled): a client-side soft warning when the body
matches a 10-digit number or an `@handle`, shown as "are you sure?" rather than
a block. It catches the honest mistake and does nothing about the deliberate
one, which is what Hide is for.

---

## 9. Caching and query keys

- `["creator-events", "me"]` — creator's own list.
- `["creator-events", "feed"]` — brand feed, `useInfiniteQuery`.
- Create / update / delete invalidate `["creator-events", "me"]` only. The
  brand feed is not invalidated from the creator's session; it refetches on
  mount and on window focus like the rest of the app.
- The "3 new posts" pill at the top of the feed is a refetch-on-focus result
  held back rather than spliced in mid-scroll. Cheap, and it stops the list
  jumping under the reader's thumb. Skip it if you want phase 3 smaller.

---

## 10. Tests

`creator-events.service.spec.ts`:

- create trims whitespace, rejects empty and >500 after trim
- create is refused for an unlisted creator
- the 11th post in 24h is refused
- editing sets `editedAt`; hiding does not
- delete sets `deletedAt` and the post leaves `/me` and the feed
- editing or deleting someone else's post returns 404, not 403

`creator-events.feed.spec.ts`:

- feed excludes hidden, deleted, and unlisted creators' posts
- feed is ordered `createdAt DESC, id DESC`
- a post inserted between page 1 and page 2 does not duplicate a row onto page 2
- the feed card carries `publicSlug`, and **no** `displayName` key is present
  on the serialized response (this is the regression test for §2)

---

## 11. Build order

| Phase | Work | Rough size |
|---|---|---|
| 1 | Prisma model + migration, `creator-events` module, creator CRUD + feed endpoints, both spec files | ~1 day |
| 2 | Creator `/creator/events` page: composer, own list, inline edit, delete dialog, right rail, nav item + gate | ~1 day |
| 3 | Brand `/brand/events` feed: tinted card (§5), infinite scroll, day separators, empty + loading states, brand & agency nav | ~0.5 day |
| 4 | Admin `/admin/events`: table, status tabs, search, hide/unhide with reason | ~0.5 day |

Phases 2 and 3 share the post-card shell; build 2 first and lift the common
parts out when 3 needs them, rather than designing a shared component up front.

---

## 12. Deliberately out of scope

- Image or video uploads on a post — and, because a post has no media, no
  portfolio thumbnails in the feed either. A card is text plus the creator's
  credentials; the profile is where the work lives.
- Likes, comments, reactions, saves
- Filters, search or sorting on the brand feed
- **Anything on the public profile page** — it already exists and already
  covers this; the feed card's profile link is the whole connection
- Any link to `CreatorUnavailability` or to order flow
- Notifications or emails when a creator posts

---

## 13. Open questions

1. **500 characters** — enough? It is about four lines. 300 makes the feed
   skimmable; 1000 invites itineraries.
2. **10 posts per day per creator** — reasonable ceiling, or lower?
3. **Agencies** — the plan gives them the feed via the existing `BRAND`
   workspace path. Confirm that is wanted.
4. **Soft delete** — kept for support and moderation evidence. Say so if you'd
   rather a creator's delete be a real delete.
5. **Save-to-wishlist on a feed card** — deliberately left off, because the
   agreed brand action was "read and open the profile". The existing
   `SaveToWishlistButton` would drop straight in if you want it; it is the one
   addition that would make the feed act on its own.
