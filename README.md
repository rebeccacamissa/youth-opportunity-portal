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
- Browser-local saved opportunities using `localStorage`.
- Mobile navigation button with Escape-to-close and focus return.
- Keyboard focus styling, semantic page landmarks, labeled forms, reduced-motion support, and sample-data/safety notices.
- Supabase Auth and partner-posting UI, plus a contact form backed by an insert-only SQL migration.
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

To enable contact-form writes, apply [`supabase/contact_submissions.sql`](./supabase/contact_submissions.sql) to the intended Supabase project and configure the project credentials in the client. The SQL permits public inserts, not reads; add abuse controls/rate limiting before production use. Auth, profile creation, organisation registration, and partner posting require their corresponding Supabase tables, policies, and role enforcement; they are not validated against a live project in this repository.

## Known limitations and next steps

- No deployed Netlify/GitHub Pages URL, production data feed, or live Supabase configuration has been verified.
- Current listings are a small fictional/sample dataset and have no verified apply URLs or listing-specific application instructions.
- Saved items are limited to the current browser and device.
- Supabase profile and partner-posting schema/policies are outside the contact-submission migration.
- Add a verified data-maintenance workflow, server-side authorization and spam protections, cross-device saved accounts, and automated browser/accessibility tests before production use.
- The included wireframes are visual references; no interactive prototype or formal user study is claimed.

## Verification

See [`TESTING.md`](./TESTING.md) for checks actually run and items that still need broader device, browser, accessibility, and live-service verification.
