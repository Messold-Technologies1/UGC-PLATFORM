# Public-page template thumbnails

Card images for the creator's "Public page" design picker
(`/creator/settings/public-page`). One `<template id>.webp` per entry in the
template registry.

These are screenshots of each template rendered against a mock profile, so they
drift if a template's layout changes. To regenerate: render
`PUBLIC_PAGE_TEMPLATES` against a mock `PublicProfileViewModel` at 1280x960,
capture the viewport (not the full page — the card shows a 4:3 crop of the top),
then resize to 760x570 and encode as WebP.

A missing file degrades to an empty card image; it does not break the picker.
