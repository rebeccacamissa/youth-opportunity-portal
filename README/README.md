# youth-opportunity-portal

## Data and contact form setup

Opportunity browse, featured listings, and detail pages use `data/opportunities.json` as the local mock data source. Keep `closingDate` in `YYYY-MM-DD` format and provide only real, verified `applicationLink` URLs; demo `example.com` links are intentionally not presented as application destinations.

The contact form stores messages in the Supabase `public.contact_submissions` table. Apply `supabase/contact_submissions.sql` in the Supabase SQL Editor before enabling the form in production. The migration allows anonymous inserts only and does not grant public read access. Configure Supabase rate limiting or another abuse-prevention mechanism before accepting public traffic.

Opportunity records currently contain demo data and do not include verified application URLs, organisation contact details, or listing-specific application instructions. Supply those from the relevant organisations before treating the records as live listings.