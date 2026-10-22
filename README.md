# Youth Opportunity Portal

**A static demonstration portal for South African youth exploring early-career opportunities.**

- **Live deployment:** Not supplied or verified. Configure the Netlify site URL here after a real deployment.
- **Repository:** [rebeccacamissa/youth-opportunity-portal](https://github.com/rebeccacamissa/youth-opportunity-portal)
- **Wireframes:** See [`Wireframes/`](./Wireframes/).

## Purpose and users

The portal brings sample internships, learnerships, bursaries, and entry-level opportunities together with practical career guidance and scam-prevention advice. It is intended for South African school leavers, tertiary students, graduates, and early-career job seekers. Every current opportunity record is demo data, not an independently verified vacancy.

## User stories

- As a young job seeker, I can search and filter sample opportunities by keyword, category, location, experience, and closing date.
- As a student or school leaver, I can review eligibility, qualifications, required documents, and application guidance before preparing an application.
- As a visitor, I can save opportunities in this browser and return to my saved list.
- As a visitor, I can read CV, cover-letter, interview, professional-profile, application-document, and scam-safety guidance.
- As a visitor, I can submit a general enquiry, listing report, opportunity suggestion, or platform feedback through the Express API.

## Features

- Responsive home, browse, details, career resources, contact/report, sign-up, and partner-posting pages.
- Dynamic listing and detail rendering from the Express API's Supabase opportunity proxy, including closing countdowns, urgency badges, and expired-listing exclusion from active feeds.
- Live keyword, category, location, experience, deadline, and saved-only filtering with an empty state and reset action.
- Saved opportunities in `localStorage` for guests, with cross-device account bookmarks for signed-in youth users when the Supabase migration is applied.
- Mobile navigation button with Escape-to-close and focus return.
- Keyboard focus styling, semantic page landmarks, labeled forms, reduced-motion support, and sample-data/safety notices.
- Supabase Auth with student/job-seeker/provider roles, role-specific profile data, verified-provider posting controls, and RLS-protected bookmarks; partner-posting UI requires provider verification.
- Express REST API for live opportunity listings and service-request/report CRUD.
- Neo-Brutalist visual theme with responsive CSS, reveal motion, card tilt, and Lenis smooth scrolling when motion is allowed and its CDN is available.

## Technology

HTML5, CSS3 (Grid/Flexbox), vanilla JavaScript, Node.js, Express, Supabase JavaScript SDK, Supabase REST/Auth, and Supabase SQL. Lenis and Google Fonts are loaded from third-party CDNs.

## Local setup

```sh
git clone https://github.com/rebeccacamissa/youth-opportunity-portal.git
cd youth-opportunity-portal
cp .env.example .env
npm install
npm start
```

Edit `.env` with the Supabase project URL and publishable key before starting the API. In PowerShell, use `Copy-Item .env.example .env` instead of `cp`. In a second terminal, serve the static frontend:

```sh
python -m http.server 8000
```

Open <http://localhost:8000/>. The API listens at <http://localhost:5000/>. The local `.env` is ignored by Git; use `.env.example` as the template and set the Supabase URL and publishable key. Use a static HTTP server rather than opening HTML via `file://`.

## Deployment

For a simple Netlify static deployment, publish the repository root (the directory containing `index.html`) and connect the repository. No build command is required. Deploy the Express API separately and set `window.PORTAL_API_BASE_URL` to its public `/api` URL before `js/supabase.js` loads; the default is for local development only. Add the deployed URL above after publishing; do not treat a local test as evidence of a live deploy. The site relies on CDN assets and is not fully offline.

## Data and service setup

The frontend now loads opportunity rows through `GET /api/opportunities`, which proxies the public Supabase `opportunities` table. The opportunity migration grants anonymous read access; run it before expecting rows from the configured database. If the table is empty, the API returns the existing sample records and marks the response with `X-Opportunity-Source: local-demo-fallback`; upstream errors are not hidden by that fallback. The browse page hides expired records.

To configure Supabase features:

1. Confirm the project URL and browser-safe publishable/anon key in [`js/supabase.js`](./js/supabase.js). Never put a service-role key in client-side code.
2. Copy `.env.example` to `.env` (or edit the local `.env`) and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `PORT`.
3. Run [`supabase/auth_roles_and_saved.sql`](./supabase/auth_roles_and_saved.sql) in the Supabase SQL Editor to create profiles, role-specific profile JSON, auth-user profile creation, saved-opportunity storage, and RLS policies. The script is designed to be rerun and enforces verified-provider access.
4. Enable email confirmation as appropriate and configure the Supabase Auth redirect/URL allow lists for the local and deployed site.
5. Verify provider organisations manually in the Supabase SQL Editor after review, using the commented update query at the end of the auth migration. Provider registration never grants verification or publishing rights by itself.

The service-request CRUD endpoint currently uses in-memory storage for learning and local testing: requests are cleared whenever the Node process restarts and are not shared across server instances. Do not use it for production or for sensitive reports without adding durable storage, access control, and abuse protection. Contact requests no longer write to `contact_submissions`; that SQL table remains for deployments that still post to Supabase directly.

Use the REST Client extension with [`requests.http`](./requests.http), or run the examples in Postman. See [`TESTING.md`](./TESTING.md) for the route list and expected responses.

## Known limitations and next steps

- No deployed Netlify/GitHub Pages URL or production data feed has been verified.
- Rows served from the configured Supabase table may be real or sample data; independently verify opportunity claims and application URLs before presenting them as live vacancies.
- Guests' saved items are limited to the current browser and device; account bookmarks require the auth migration and a signed-in youth profile.
- Provider-created opportunities require the current auth migration, a verified profile, and RLS policies.
- Add a verified data-maintenance workflow, server-side authorization and spam protections, cross-device saved accounts, and automated browser/accessibility tests before production use.
- The included wireframes are visual references; no interactive prototype or formal user study is claimed.

## Verification

See [`TESTING.md`](./TESTING.md) for checks actually run and items that still need broader device, browser, accessibility, and live-service verification.
