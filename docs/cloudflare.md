# Deploy GHACOE to Cloudflare Pages

The GitHub repository serves both **Cloudflare Pages** and the existing **Vercel** setup.
The public website is static; Cloudflare Pages Functions handle the three API routes.
Do not remove Vercel until the Cloudflare deployment has passed testing.

## Create the Cloudflare Pages project

1. In Cloudflare **Workers & Pages**, create a new **Pages** project and select **Connect to Git**.
2. Authorize the GitHub repository `learngermanghana/ghacoe-website`. Do not select any Falowen or Sedifex repository.
3. Production branch: `main`. Framework preset: **None** / **Other**.
4. Root directory: repository root; build command: `npm run build`; build output directory: `dist`.
5. Set build environment variable `NODE_VERSION=22` if your Cloudflare build environment is not already using Node 22.
6. Deploy to the temporary `*.pages.dev` hostname. The `functions/api` routes are packaged automatically. No separate Worker or paid service is required for basic use.

Cloudflare-specific files:
- `functions/api/site-config.js`: GET /api/site-config
- `functions/api/applications.js`: POST /api/applications
- `functions/api/donations.js`: POST /api/donations
- `_routes.json`: routes only `/api/*` to Functions (static assets never invoke Functions)
- `_headers`: security headers on static assets

The old `api/` directory and `vercel.json` are intentionally preserved for a safe rollback.

## Configure server-side variables

Set these under the Cloudflare Pages project's **Settings > Variables and Secrets** (for both Production and Preview only as appropriate). Do **not** put real values in Git, client JavaScript or a public `.env` file.

| Variable | Usage |
| --- | --- |
| `SEDIFEX_STORE_ID` | GHACOE's own NGO workspace ID |
| `SEDIFEX_VOLUNTEER_URL` | Verified HTTPS endpoint for volunteerIntake |
| `SEDIFEX_SUPPORT_URL` | Verified HTTPS endpoint for supportRequestIntake |
| `SEDIFEX_API_BASE_URL` | Verified HTTPS origin for Sedifex API |
| `PUBLIC_SITE_URL` | Exact public origin, for example `https://example.org` (no path) |
| `DONATIONS_ENABLED` | Keep `false` until payment testing, routing and webhook validation are complete |

`PUBLIC_SITE_URL` must be the origin to which Paystack redirects after checkout.
Change it to the confirmed production domain at cutover. Preview deployments should keep donations
disabled unless explicitly testing safe non-production payment credentials and a verified return origin.

## Verify before domain cutover

1. Open the temporary `pages.dev` URL, check desktop/mobile layout, images, navigation and browser console.
2. Visit `/api/site-config` and verify the correct enabled/disabled flags. This response must not expose secrets.
3. Test a volunteer submission and a support/training submission with consent. Confirm each arrives in GHACOE's Sedifex workspace, not another organization's workspace.
4. Ensure missing consent, invalid inputs, and cross-origin JSON submissions are rejected.
5. Keep donations disabled until GHACOE's merchant, Paystack settlement account, receipt and webhook handling are verified in **test mode**. Test success, cancelled checkout and pending verification; verify the browser never marks a payment paid on its own.
6. Apply available Cloudflare WAF/rate-limit rules on `/api/applications` and `/api/donations` before accepting public submissions. The upstream Sedifex rate limiter must remain enabled.
7. Confirm `npm test` and `npm run build` pass on the GitHub PR.
8. Only after all tests succeed, add the custom domain in **Workers & Pages > your site > Custom domains**, confirm DNS/SSL, and update `PUBLIC_SITE_URL` accordingly. Keep Vercel online until cutover is verified.

## Rollback

If Cloudflare has an issue, restore the previous DNS record to the working Vercel deployment.
The previous Vercel `api/` functions and configuration remain in the repository.

## Important

Content, images and contact information still require GHACOE approval before public launch.
Sedifex's NGO intake and donation infrastructure must be deployed and tested first.
Cloudflare hosting alone does not enable the services without correct bindings and working Sedifex endpoints.
