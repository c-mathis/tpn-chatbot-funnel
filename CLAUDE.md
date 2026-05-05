# Tax Peace Now (TPN) / Five Star Tax

**Type:** Tax relief lead generation funnel
**Stack:** Static HTML/CSS/JS, Cloudflare Workers
**Domain:** taxpeacenow.com

---

## Business Overview

### Services Offered

- Tax Relief
- Offer in Compromise (OIC)
- Installment Agreement
- Penalty Abatement
- IRS Fresh Start Program
- Wage Garnishment Help
- Unfiled Tax Returns
- Tax Preparation

### Target Audience

- Business owners with tax issues
- Self-employed/contractors (1099)
- Individuals facing IRS collections
- People with tax debt

### Conversion Goal

Free 2-minute assessment via chatbot interface

**Character:** "Kirk" - friendly guide avatar

---

## Lead Distribution

- Two tax resolution firms (smart distribution based on tax problem/debt amount)
- Leads distributed via custom CRM with D1 database
- Firms handle all follow-up (no internal sales team)

### Email Notifications

**User Confirmation Emails:**
- Sent to ALL leads (both buyers)
- From: `kirk@taxpeacenow.com`
- Includes buyer phone number and next steps

**Internal Notifications:**
- **Apex Tax Team leads ONLY** → `Alston@apextaxteam.com`
- Trusted Tax leads → No internal notifications (pending additional email addresses)
- From: `leads@taxpeacenow.com`
- Includes full lead details, routing info, and UTM attribution

---

## Site Structure

```
tpn-funnel/
├── index.html          # Main funnel with chatbot assessment
├── blog/               # Blog articles (2 articles)
│   ├── index.html
│   └── what-is-an-offer-in-compromise.html
├── services/           # Service landing pages (8 pages)
│   ├── tax-relief.html
│   ├── offer-in-compromise.html
│   ├── installment-agreement.html
│   ├── penalty-abatement.html
│   ├── fresh-start-program.html
│   ├── wage-garnishment.html
│   ├── unfiled-tax-returns.html
│   └── tax-preparation.html
├── assets/
│   └── wizard.js       # Chatbot + tracking implementation
├── cloudflare-worker.js
└── thank-you.html
```

---

## Analytics & Tracking Stack

**Status:** Live in production as of 2026-04-14

This is the reference implementation of the **Standard Analytics Stack** — mirror this setup on every new site.

See full documentation: `/Users/beef/Repository/references/analytics/standard-stack.md`

### Tracking IDs

- **GA4 Measurement ID:** `G-RFVN78XR1Q`
- **Microsoft Clarity Project:** `wbgv8fk2rq`
- **Google Ads Conversion ID:** `AW-17497432656`
- **Meta Pixel ID:** `359485176693329`
- **Cloudflare Worker:** `tax-peace-conversions` at `https://tax-peace-conversions.cameron-07f.workers.dev/`

### Deployed Features

**1. GA4 Micro-Conversions** (in `assets/wizard.js`):
- `chatbot_start`
- `form_step_complete` (per step, with `tax_problem`/`debt_amount`/`service_type`)
- `funnel_qualified`
- `funnel_state_selected`
- `scroll_depth` (25/50/75/100%)
- `phone_click` (delegated listener on all `tel:` links)
- `generate_lead` on submit

**2. UTM Capture + Persistence:**
- First-touch attribution
- Persists in `sessionStorage`
- Attaches to every GA4 event AND form payload
- Flows to Cloudflare Worker → D1 database

**3. Server-Side GA4 Measurement Protocol:**
- Fires `generate_lead` server-side
- Uses browser's `client_id` for session stitching
- Tagged `delivery_method: 'server'`
- Survives ad blockers / iOS ITP

**4. Microsoft Clarity:**
- Loads on every page
- Heatmaps + session recordings

### Cloudflare Worker Environment Variables

Set via `wrangler secret put` on 2026-04-14:
- `GA4_MEASUREMENT_ID` = `G-RFVN78XR1Q`
- `GA4_API_SECRET` = `Rn-bXG9ZSbeE8PWsRZdrtw`

### Pending GA4 Admin Tasks

Manual tasks after ~24h of events:
- Mark `generate_lead`, `funnel_qualified`, `phone_click` as Key Events
- Create event-scoped custom dimensions for `tax_problem`, `debt_amount`, `state`, `delivery_method`
- Link GSC in GA4 Admin → Product links
- In Clarity: Settings → Integrations → GA4 to enable session jump links

---

## Meta Pixel Configuration

**Last Updated:** 2026-04-09
**Pixel ID:** `359485176693329`
**Conversion Event:** `CompleteRegistration` fires when form submitted

### Tracking Logic (assets/wizard.js)

✅ **Tracks:** Facebook ad traffic (has `fbclid` parameter or `_fbc` cookie)
❌ **Does NOT track:** Organic traffic, Google Ads, direct visits
❌ **Does NOT track:** Test leads (URL contains `?test=true`)

**Rationale:** Only track conversions from traffic Facebook actually sent. This ensures accurate ROAS and prevents organic conversions from being attributed to paid ads.

### Testing URLs

- Real leads (organic): `https://taxpeacenow.com/` → No Meta tracking
- Real leads (from FB): `https://taxpeacenow.com/?fbclid=...` → Meta tracking ✅
- Test leads: `https://taxpeacenow.com/?test=true` → No tracking (any source)

### Advanced Matching

Email, phone, first name, last name sent with every conversion for better attribution.

### Server-Side Meta CAPI

**Disabled** (browser pixel only). Cloudflare Worker does NOT send server-side events to Meta CAPI.

---

## SEO Implementation (2026-03-03)

Complete technical SEO overhaul implemented:

- **54 pages** fully optimized with canonical URLs + OG tags
- **robots.txt** + **sitemap.xml** created
- **5 schema types** added: Organization, WebSite, Service, Article, FAQ, Breadcrumb
- **Rich snippets enabled** via FAQ schema on service pages
- **Indexing fixed** - pages were not showing in GSC due to missing canonical/sitemap

See technical checklist: `/Users/beef/Repository/references/seo/technical-checklist.md`

---

## Programmatic SEO Strategy (2026-02-26)

**Document:** `/Users/beef/Repository/tpn-funnel/PROGRAMMATIC_SEO_STRATEGY.md`

### Recommended Playbooks (Priority Order)

1. **Locations** - `[service] in [city]` - 1,600+ page potential
2. **Glossary** - `what is [tax term]` - 100+ pages
3. **Personas** - `[service] for [audience]` - 160 pages
4. **Tax Debt Amounts** - `owe $[X] to irs` - 15 pages
5. **IRS Notice Codes** - `irs notice [code]` - 50+ pages
6. **State-Specific** - `[state] tax relief` - 50 pages

### Implementation Phases

- **Phase 1:** IRS Notice Codes + Debt Amount pages (quick wins)
- **Phase 2:** Glossary + Top Personas (authority building)
- **Phase 3:** Top 50 Cities location pages (local domination)
- **Phase 4:** Full location expansion + state pages

**Key Insight:** Tax relief has MASSIVE local search intent. Location pages are the biggest opportunity but require unique local data per page to avoid thin content penalties.

---

## Future Enhancements (Saved for Later)

### AI Chat Abandonment Recovery

If user sits on question 30+ seconds, show "Need help?" button with AI assistant to answer FAQs:
- "What counts as unfiled returns?"
- "Difference between IRS and state tax?"

**Expected impact:** 10-20% reduction in abandonment
**Cost:** ~$0.01 per helped user via Claude API

### Email Re-engagement

AI-powered email 1hr after form abandonment: "We noticed you started your tax assessment. Need help?"

**Expected recovery:** 5-10% of abandoned leads
**Cost:** ~$0.001 per email

---

## Pending Setup Tasks

### Google Search Console MCP Integration

**Status:** 🔴 Not configured
**Priority:** Medium
**Setup time:** 5-10 minutes
**Guide:** `/Users/beef/Repository/tpn-funnel/SETUP_GSC_MCP.md`

**What this enables:**
- Direct GSC data access through Claude
- Real-time keyword performance analysis
- Indexing status monitoring
- CTR optimization opportunities
- Automated sitemap validation

**Quick setup:**
1. Enable Search Console API in Google Cloud Console
2. Create OAuth credentials (Desktop app)
3. Download `client_secret.json` → `~/.config/gsc-mcp/`
4. Run: `claude mcp add gsc --transport stdio --scope user -- uvx mcp-gsc`
5. Restart Claude Desktop

**Helper scripts created:**
- `setup-gsc-oauth.js` - Fully automated Playwright script
- `setup-gsc-simple.js` - Opens browser to right pages with instructions

---

## Recent Updates

### 2026-05-04: Duplicate Lead Prevention

**Deployed to production:**
- Cloudflare Worker checks email/phone before INSERT
- Duplicates skip all conversion tracking (Meta + GA4)
- Separate thank-you page shows buyer phone number
- Prevents ROAS metric skewing from duplicate submissions

**Files changed:**
- `cloudflare-worker.js` - Added duplicate detection query
- `assets/wizard.js` + `src/assets/wizard.js` - Duplicate response handling
- `src/thank-you-duplicate.njk` - New duplicate landing page

---

## Related Documentation

- Standard Analytics Stack: `/Users/beef/Repository/references/analytics/standard-stack.md`
- SEO Technical Checklist: `/Users/beef/Repository/references/seo/technical-checklist.md`
- Schema Examples: `/Users/beef/Repository/references/seo/schema-examples.md`
