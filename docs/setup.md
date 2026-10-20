# GHACOE website setup

## Design
Plum, warm ivory and gold; a responsive homepage with story, programmes, Ideal Womanhood Project, gatherings, ways to get involved and contact.
The hero uses illustrative Unsplash stock photography. Programme panels use original decorative typography rather than presenting stock images as actual ministry work.
Replace the wordmark and stock image with GHACOE-approved branding and photographs.
No event dates, testimonials, donation totals, telephone numbers or leadership claims are invented.
The public Facebook link is the one supplied in the project brief and requires confirmation before launch.

## Local work
Requires Node.js 22+. No package installation is needed.
Run `npm test` and `npm run build`.
Serve `dist/` using your preferred static web server for design review.
API-backed forms require a host that supports the included Node serverless functions; opening index.html directly will not enable the integrations.

## Vercel
Import this repository as a NEW project. Do not link it to the existing Sedifex or Falowen projects.
Use framework preset Other and repository root as the root directory.
Build command: npm run build. Output directory: dist.
The api/ directory contains serverless handlers. No frontend secrets are required.
Set the environment variables below and redeploy after changing them.
Use preview protection until GHACOE approves the content.

## Sedifex connection
- SEDIFEX_STORE_ID: GHACOE's own NGO workspace ID.
- SEDIFEX_VOLUNTEER_URL: full deployed HTTPS URL of volunteerIntake.
- SEDIFEX_SUPPORT_URL: full deployed HTTPS URL of supportRequestIntake.
- SEDIFEX_API_BASE_URL: HTTPS origin of Sedifex's web API deployment.
- PUBLIC_SITE_URL: exact public HTTPS origin of this website.
- DONATIONS_ENABLED: leave false until payment routing is verified.

Store identity and upstream destinations are selected on the server, never accepted from website form payloads.
Volunteer submissions go to volunteer_applications. Support and training enquiries go to support_requests; training is marked with the prefix Training enquiry. Partnership enquiries currently link to the ministry's contact channel.
Forms include follow-up consent, validation and an empty honeypot.
Rate limiting is enforced by Sedifex's protected NGO intake. Deploy the NGO readiness changes (Sedifex PR 1715) first.
Configure hosting firewall rate limits for applications and donations before accepting public submissions; no unreliable in-memory limiter is used.

Donations use donor-portal-sync, redirect to the Paystack checkout host and verify the returned reference through donations-payment-confirmation. The browser never marks donations paid.
Paystack secrets stay in Sedifex. Test GHACOE's merchant settlement destination and webhook in test mode before enabling donations.

## Launch requirements
- GHACOE content, branding, photography and privacy approval.
- Confirm contacts and Facebook account ownership.
- Confirm Sedifex readiness changes have been deployed.
- Verify volunteer/support submissions in the GHACOE dashboard and notification recipients.
- Test donation success, cancelled payment and retry; confirm actual merchant routing and receipts.
- Replace design-preview footer notice when approval is complete.
- Add confirmed events and a public events feed before offering event registration.
- Browser QA at 360px, 768px and desktop, keyboard focus, dialog close and menu toggling.
- The current repo was prepared through GitHub without a local browser runtime. CI covers server behavior and static build, not visual browser QA.

## Future content management
This initial version keeps editorial content in index.html. Sedifex blog, gallery and event-feed connections are follow-up work; they are not automatically synced.
