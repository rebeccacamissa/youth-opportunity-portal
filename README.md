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
- As a visitor, I can submit a general enquiry, listing report, opportunity suggestion, or platform feedback when the Supabase contact table is configured.

## Features

- Responsive home, browse, details, career resources, contact/report, sign-up, and partner-posting pages.
- Dynamic listing and detail rendering from [`data/opportunities.json`](./data/opportunities.json), including closing countdowns, urgency badges, and expired-listing exclusion from active feeds.
- Live keyword, category, location, experience, deadline, and saved-only filtering with an empty state and reset action.
- Saved opportunities in `localStorage` for guests, with cross-device account bookmarks for signed-in youth users when the Supabase migration is applied.
- Mobile navigation button with Escape-to-close and focus return.
- Keyboard focus styling, semantic page landmarks, labeled forms, reduced-motion support, and sample-data/safety notices.
- Supabase Auth with youth/provider roles, profile creation, verified-provider posting controls, and RLS-protected bookmarks; partner-posting UI requires provider verification.
- Neo-Brutalist visual theme with responsive CSS, reveal motion, card tilt, and Lenis smooth scrolling when motion is allowed and its CDN is available.

## Technology

HTML5, CSS3 (Grid/Flexbox), vanilla JavaScript, JSON, browser `localStorage`, Supabase JavaScript SDK, and Supabase SQL. Lenis and Google Fonts are loaded from third-party CDNs.

## Local setup

```sh
git clone https://github.com/rebeccacamissa/youth-opportunity-portal.git
cd youth-opportunity-portal
python -m http.server 8000
```

Open <http://localhost:8000/>. Use a static HTTP server rather than opening `index.html` directly, because browsers commonly block `fetch()` of the local JSON file on `file://`.

## Deployment

For a simple Netlify static deployment, publish the repository root (the directory containing `index.html`) and connect the repository. No build command is required. Add the deployed URL above after publishing; do not treat a local test as evidence of a live deploy. The site relies on CDN assets and is not fully offline.

## Data and service setup

The JSON records are clearly labeled sample opportunities. Their `applicationLink` and `sourceUrl` values are null, and `verifiedStatus` is false, so the detail view does not invent an application destination. Replace them only with current information checked against official organisation sources. The browse page hides expired records; it does not delete them from the local JSON file.

To enable Supabase features:

1. Confirm the project URL and browser-safe publishable/anon key in [`js/supabase.js`](./js/supabase.js). Never put a service-role key in client-side code.
2. Run [`supabase/auth_roles_and_saved.sql`](./supabase/auth_roles_and_saved.sql) in the Supabase SQL Editor to create profiles, auth-user profile creation, saved-opportunity storage, and RLS policies. The script is designed to be rerun: it extends an older `opportunities` table and replaces its policies to enforce verified-provider access.
3. Apply [`supabase/contact_submissions.sql`](./supabase/contact_submissions.sql) for the contact/report form.
4. Enable email confirmation as appropriate and configure the Supabase Auth redirect/URL allow lists for the local and deployed site.
5. Verify provider organisations manually in the Supabase SQL Editor after review, using the commented update query at the end of the auth migration. Provider registration never grants verification or publishing rights by itself.

The opportunities page currently reads the sample feed from `data/opportunities.json`; provider-created rows are stored in the remote `opportunities` table but are not yet merged into that local feed. A read-only check of the configured Supabase project found an older `opportunities` schema without the columns required by provider posting. A successful earlier SQL run did not add those columns because the table already existed, so run the current migration again before testing posts. No successful sign-in or database write has been validated from this repository.

## Known limitations and next steps

- No deployed Netlify/GitHub Pages URL or production data feed has been verified.
- Current listings are a small fictional/sample dataset and have no verified apply URLs or listing-specific application instructions.
- Guests' saved items are limited to the current browser and device; account bookmarks require the auth migration and a signed-in youth profile.
- Provider-created opportunities require the current auth migration, a verified profile, and RLS policies; they currently do not appear in the static sample feed.
- Add a verified data-maintenance workflow, server-side authorization and spam protections, cross-device saved accounts, and automated browser/accessibility tests before production use.
- The included wireframes are visual references; no interactive prototype or formal user study is claimed.

## Verification

See [`TESTING.md`](./TESTING.md) for checks actually run and items that still need broader device, browser, accessibility, and live-service verification.
