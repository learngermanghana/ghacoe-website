# GHACOE Women's Ministry

Public website for the Ghana Congress on Evangelisation Women's Ministry.

A lightweight, responsive static website with optional server-side Sedifex integration
for volunteer applications, support enquiries and donations.

## Hosting

**Cloudflare Pages is the preferred host.** GitHub auto-deploys the static `dist/`
build and three Cloudflare Pages Functions for `/api/*`.
See [Cloudflare deployment and cutover guide](docs/cloudflare.md).

The existing Vercel implementation (`api/` and `vercel.json`) is retained for
rollback during migration. See [site setup](docs/setup.md) for the original integration
details.

## Development

Requires Node 22+ and no npm install: `npm test` and `npm run build`.
Static files are produced in `dist/`. The connected forms need server-side variables
and deployed Functions; opening `index.html` alone does not enable them.

**Launch status:** Design and integration starter. Organization content, contacts,
branding and images require GHACOE approval before public launch.
