# Email Enrichment -- Waterfall Reference

This is Mason's detailed reference for finding and verifying emails. See `lead-qualification/SKILL.md` for the full qualification flow.

## The Waterfall (in order)

### Source 1: Instagram Bio Email
**Cost:** Free
**How:** Parse the bio text for email patterns. Look for:
- Standard email format: `word@domain.tld`
- Obfuscated emails: "email me at name [at] gmail [dot] com"
- "Business inquiries: email@example.com"
- "Contact: email@example.com"

Business/creator accounts often display email directly in their profile contact info.

### Source 2: Linktree / Website
**Cost:** Near-free (Apify credits)
**How:**
- If profile has a Linktree URL, scrape it for:
  - Email links (mailto: hrefs)
  - Contact buttons
  - "Business inquiries" or "Bookings" links
- If profile has a personal website:
  - Check /contact, /about, /coaching pages
  - Check page footer
  - Check meta tags (some sites include contact email in metadata)

### Source 3: Apollo.io
**Cost:** Free tier (60 credits/month)
**How:**
1. Search Apollo by person's name + any known details
2. If they have a website, search by domain
3. Apollo returns verified professional emails
**Rate limit:** ~2 lookups/day to last the month. Prioritize leads with 200K+ followers.

### Source 4: Snov.io
**Cost:** Free tier (50 credits/month)
**How:**
1. Use email finder by name + domain
2. Or use the domain search to find all emails at their website domain
**Rate limit:** ~1.7 lookups/day. Same priority rules as Apollo.

### Source 5: Google Search
**Cost:** Free
**How:** Search queries to try:
- `"@their_handle" email`
- `"Their Name" fitness email`
- `"Their Name" contact coaching`
- `site:their-website.com email OR contact`
- Check podcast appearance pages, press features, collaboration request pages

## Verification via MillionVerifier

Every email gets verified before it counts:

| Result | Action |
|--------|--------|
| Valid | `email_verified = true` -- good to go |
| Risky | `email_verified = false` -- still include, flag for Rex |
| Invalid | Discard, try next source |
| Unknown | Treat as risky |

## Credit Tracking

Keep a running count in each enrichment batch:
- Apollo credits used today / this month
- Snov credits used today / this month
- MillionVerifier verifications today / this month

Report these numbers to Rex with each batch completion. If any source is running low, Rex decides whether to find alternatives or adjust strategy.

## Priority Order for Paid Credits

When using Apollo/Snov (limited credits), prioritize:
1. Leads with 200K+ followers (higher value)
2. Leads where bio indicates they're actively posting (engagement signals)
3. Leads with websites (domain search is more reliable)

Don't waste paid credits on leads where a Google search would probably work.
