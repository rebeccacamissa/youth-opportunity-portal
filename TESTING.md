# Testing and Verification

This report records repository and local-browser checks only. It does not claim a live Netlify deployment, production Supabase writes, or cross-browser/device certification.

## Checks performed

| Area | Result | Evidence |
|---|---|---|
| JavaScript syntax | Pass (previous baseline) | `node --check js/main.js` and `node --check js/supabase.js`; rerun after edits |
| Opportunity data | Pass | Express returns Supabase rows, or clearly marked local demo listings when the Supabase table is empty |
| Static page serving and page crawl | Pass | Served the repository and opened all seven HTML pages in integrated Chromium; all loaded the stylesheet and expected scripts, had semantic main/nav/footer landmarks, and no broken local links |
| Keyword filtering | Pass (previous baseline) | Browse page loaded 3 sample cards; searching `learnership` returned 1 |
| Empty results and reset | Pass | A no-match query showed “No opportunities found”; Reset filters restored all 3 cards |
| Dataset fetch failure | Pass (simulated HTTP 503) | Featured results and closing-soon widget show explicit error messages |
| Closing dates | Pass | The local 7-day filter returned the single listing closing in 6 days; cards show calculated countdowns and urgency |
| Category and saved filters | Pass | Entry-Level Jobs returned 1 card; saving persisted the ID in `localStorage`; saved-only returned that card |
| Opportunity details | Pass | Opened the filtered listing and checked its full description, qualifications, documents, update date, demo label, and safe no-URL message |
| Expired listing handling | Pass (simulated expired record) | Detail notice appeared, countdown read “Expired,” and even a supplied HTTP URL was not actionable |
| Contact form/API integration | Pass (local) | Browser submission reached `POST /api/requests` and showed the success status; temporary request was removed |
| Mobile navigation/layout | Pass (local Chromium) | At a 390px requested viewport, burger opened and Escape closed it, `aria-expanded` reset, focus returned to the toggle, and no horizontal overflow was measured |
| Responsive layout widths | Pass (local Chromium) | Checked requested widths of 360, 390, 768, and 1024px; no horizontal overflow was measured |
| Registration wizard | Pass (local Chromium) | Step 1 validation, all three role panels, progress update, Back state retention, conditional required fields, and interest validation |
| Auth screen/navigation | Pass (local Chromium) | Sign-in/sign-up tabs, logged-out nav actions, and signed-out provider-page gate rendered as expected |
| Express API CRUD | Pass (local) | Create, list, read, patch, put, delete, missing-record `404`, and invalid-payload `400` checks |
| Opportunity API proxy | Pass (local) | Normalized 3 demo rows when Supabase returned an empty array; response marked `X-Opportunity-Source: local-demo-fallback` |
| Node dependencies | Pass | `npm install` completed; `npm audit` reported zero vulnerabilities |
| Supabase Auth negative path | Pass (live request) | Invalid non-existent test email returned the expected “Invalid login credentials” feedback; no account was created |
| Existing Supabase table schema | Found issue | Read-only API inspection found an existing `opportunities` table missing `organization_name`, `closing_date`, `application_url`, and other fields used by provider posting; the current migration now adds them and must be rerun |
| Supabase profile/bookmark privacy | Pass (anonymous requests) | Anonymous reads of `profiles` and `user_saved_opportunities` were denied as expected |
| Color contrast samples | Pass for sampled pairs | Computed static color ratios are listed below; this is not a complete WCAG audit |
| Successful authentication/account roles | Not tested | No existing test account credentials were available; no production account was created |
| Provider posting / youth account bookmarks | Not yet testable | Requires rerunning the updated migration, a verified provider account, and a youth account |
| Express API | Added; not yet validated | Run the local commands and REST examples below after dependency installation |
| Supabase registration/profile persistence | Not tested | Requires applying the updated auth migration and a controlled test account |
| Deployment | Not verified | No live deployment URL was supplied |

## Accessibility and responsive behavior

The markup includes semantic landmarks, labeled form controls, keyboard-visible focus styles, a skip link on the home page, an accessible mobile-navigation button, status regions for dynamic results, and reduced-motion fallbacks. The stylesheet uses a 16px base size and responsive single-column rules below 768px.

The following still require dedicated verification before release:

- Manual keyboard and screen-reader review across every page, including auth flows and dynamic result updates.
- Automated WCAG checks and a documented contrast audit for all text/background combinations and hover states.
- Visual checks across multiple real desktop, tablet, and mobile browsers/devices (the current viewport checks use one integrated Chromium browser).
- Successful sign-in, sign-up, role-specific navigation, verified-provider posting, and student/job-seeker bookmark writes with dedicated test accounts.
- Rerun the updated auth migration before provider-posting tests; live schema inspection found the pre-existing opportunity table did not match the posting code.
- Durable request storage, administrative access controls, rate limits, and abuse protection before using the contact API with real personal information.

### Sampled contrast ratios

Computed using the WCAG relative-luminance contrast formula; each selected text pair exceeds 4.5:1 for normal text:

| Foreground on background | Ratio |
|---|---:|
| `#111111` on `#F7F4EB` | 17.17:1 |
| `#454545` on `#FFFFFF` | 9.59:1 |
| `#FFFFFF` on `#0D5CFF` | 5.26:1 |
| `#FFFFFF` on `#7000FF` | 6.70:1 |
| `#111111` on `#FFC72C` | 12.10:1 |
| `#111111` on `#FF3366` | 5.32:1 |

These samples do not include every component state, image, or browser rendering and are not a certification.

## Reproduction

From the project root, run `npm install` and `npm start`, then in another terminal run `python -m http.server 8000`. Open <http://localhost:8000/>. Opening HTML files directly via `file://` is not valid for API calls.

## Express REST API

Use VS Code's REST Client extension with [`requests.http`](./requests.http), or enter these URLs in Postman. The API base is `http://localhost:5000`.

| Method | Endpoint | Expected result |
|---|---|---|
| GET | `/api/health` | `200` API health message |
| GET | `/api/opportunities` | `200` array of normalized Supabase opportunity records |
| GET | `/api/requests` | `200` array of requests in this server process |
| GET | `/api/requests/:id` | `200` request or `404` JSON error |
| POST | `/api/requests` | `201` created request; requires `type`, `name`, `email`, `subject`, and `message` |
| PUT / PATCH | `/api/requests/:id` | `200` updated request; body must include an allowed `status` |
| DELETE | `/api/requests/:id` | `200` success message or `404` JSON error |

Valid request types are `general`, `report`, `suggest`, and `feedback`. Valid statuses are `pending`, `in_progress`, `resolved`, and `rejected`. Invalid payloads return `400` with `{ "success": false, "message": "..." }`. The request collection is intentionally in-memory and is cleared when the server restarts; persistent storage and production security controls are future work.

The opportunity proxy requires the Supabase URL/key in `.env` and read access on the `opportunities` table. If the upstream feed is unavailable, the API returns a clear `502`/`503` error instead of returning fabricated data.
