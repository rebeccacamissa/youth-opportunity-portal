# Youth Opportunity Portal — Presentation Outline

## Slide 1 — Project Introduction
- Youth Opportunity Portal: a responsive demonstration site for South African youth.
- Show the home page and explain that listings are explicitly sample data.

## Slide 2 — Problem Statement
- Young people can face fragmented access to early-career openings and application advice.
- Unverified posts and recruitment scams can expose job seekers to wasted effort or harm.

## Slide 3 — Target Users
- Matriculants and school leavers.
- Tertiary students seeking funding or work experience.
- Graduates and early-career job seekers.
- Organisations and community partners (partner tools need production authorization before use).

## Slide 4 — Proposed Solution
- A single portal combining searchable sample opportunities, detailed application guidance, career resources, and prominent safety advice.
- Emphasize that the current dataset is demonstrative, not a live vacancy feed.

## Slide 5 — User Journey
- Explore the home page and safety alert.
- Search or filter opportunities by category, location, experience, or closing date.
- Save a listing, review its details and checklist, and follow only a verified official application URL when supplied.
- Use career resources or report a listing.

## Slide 6 — Main Features
- Dynamic opportunity cards, detail pages, countdowns, active-listing expiry handling, and browser-local saved items.
- Contact/report form, document checklist, CV/interview/profile/cover-letter guidance, and scam education.
- Responsive layout, accessible focus indicators, reduced-motion support, and mobile navigation.

## Slide 7 — Technologies Used
- HTML5, CSS Grid/Flexbox, vanilla JavaScript, JSON, and `localStorage`.
- Supabase Auth/contact integration points and SQL for contact submissions.
- Lenis and Google Fonts are optional third-party CDN dependencies.

## Slide 8 — Challenges & Technical Solutions
- Static hosting cannot read a local JSON file through `file://`; use a local HTTP server.
- Data is normalized in one JSON source and rendered consistently for browse, featured, and details views.
- Expired items are filtered out of active feeds; demo links are not fabricated.
- Reduced-motion and fallback behavior help keep motion effects usable.

## Slide 9 — Live Demonstration Walkthrough
- Run the static site locally or insert the actual Netlify URL after deployment.
- Demonstrate search, filters, empty-state reset, saved listings, details, and resources.
- Do not claim live Supabase submission or a production deployment unless those have been configured and tested.

## Slide 10 — Future Improvements
- Add a verified, regularly maintained opportunity source and official application URLs.
- Complete Supabase schemas, role-based authorization, privacy controls, and rate limiting.
- Add automated tests, WCAG audit, usability research, analytics with consent, and cross-device saved profiles.
