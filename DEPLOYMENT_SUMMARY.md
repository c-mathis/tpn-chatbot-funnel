# TPN Funnel - Production Deployment Summary

**Date:** 2026-04-02
**Status:** ✅ Ready for Traffic

---

## Deployment Checklist

### ✅ Cloudflare Worker
- **URL:** https://tax-peace-conversions.api-fivestartax.workers.dev/
- **Status:** Deployed (Version: ad93702a-b5af-4051-b1a6-c92888e44773)
- **Bindings:**
  - D1 Database: `tpn_crm` (f8be108b-1ee4-4eef-91e5-41bcdc323abc)
  - KV Namespace: `SESSIONS_KV` (43ebe6d1074249bf83b89fd4a1b5e990)

### ✅ Database Setup
- **Tables:** leads, buyers, settings, lead_events
- **Buyers:** 2 configured (placeholders - update via SQL)
- **Round-robin:** Working (tested)
- **Test Lead:** Successfully created and cleaned up

### ✅ Frontend Integration
- **Worker Endpoint:** Updated in [assets/wizard.js:750](file:///Users/beef/Repository/tpn-funnel/assets/wizard.js#L750)
- **Meta Pixel:** Installed (ID: 359485176693329)
- **Google Ads:** Installed (ID: AW-17497432656)
- **Conversions API:** Disabled (browser pixel sufficient)

### ✅ Lead Flow Verified
1. Form submission → Cloudflare Worker
2. Worker → D1 database storage
3. Round-robin buyer assignment (working)
4. Meta Pixel conversion tracking (browser-side)
5. Google Ads conversion tracking (browser-side)

---

## Next Steps Before Launch

### 1. Update Buyer Information
Replace placeholder data with real companies:

```sql
-- Buyer 1
UPDATE buyers SET
  name = 'Real Company Name',
  phone_number = '(XXX) XXX-XXXX',
  email = 'contact@company1.com'
WHERE id = 1;

-- Buyer 2
UPDATE buyers SET
  name = 'Real Company Name',
  phone_number = '(XXX) XXX-XXXX',
  email = 'contact@company2.com'
WHERE id = 2;
```

Run via:
```bash
wrangler d1 execute tpn_crm --remote --command "UPDATE buyers SET..."
```

### 2. Deploy Frontend Updates
Since site is already deployed, the Git push will trigger automatic deployment. The updated `wizard.js` with the correct worker endpoint is now in the repo.

### 3. Monitor First Leads
Check leads dashboard:
```bash
wrangler d1 execute tpn_crm --remote --command "SELECT * FROM leads ORDER BY created_at DESC LIMIT 10"
```

---

## Lead Management

### View All Leads
```bash
wrangler d1 execute tpn_crm --remote --command "SELECT id, first_name, last_name, email, phone, state, tax_problem, buyer_id, status, created_at FROM leads ORDER BY created_at DESC LIMIT 20"
```

### Export Leads to CSV
```bash
wrangler d1 execute tpn_crm --remote --command "SELECT * FROM leads" --json > leads_export.json
```

### Check Buyer Distribution
```bash
wrangler d1 execute tpn_crm --remote --command "SELECT b.name, COUNT(l.id) as total_leads FROM buyers b LEFT JOIN leads l ON b.id = l.buyer_id GROUP BY b.id, b.name"
```

### Update Lead Status
```bash
wrangler d1 execute tpn_crm --remote --command "UPDATE leads SET status = 'contacted' WHERE id = [LEAD_ID]"
```

Valid statuses: `new`, `contacted`, `qualified`, `converted`, `lost`

---

## CRM API (For Future Dashboard)

The worker also includes a CRM API at `/workers/crm-api.js` (not deployed yet):

- `GET /api/leads` - List/filter leads
- `PUT /api/leads/:id` - Update status
- `GET /api/buyers` - View buyers
- `PUT /api/buyers/:id` - Adjust weights
- `GET /api/export` - CSV export
- `GET /api/metrics` - Dashboard stats

To deploy:
```bash
wrangler deploy workers/crm-api.js
```

---

## Tracking Configuration

### Meta Pixel (Browser-Side)
- **Pixel ID:** 359485176693329
- **Events:** PageView, CompleteRegistration
- **Advanced Matching:** Enabled (email, phone, name)

### Google Ads
- **Conversion ID:** AW-17497432656
- **Event:** conversion (form_submission)

### Meta Conversions API
- **Status:** Disabled
- Browser pixel tracking is sufficient for conversion attribution

---

## Database Schema

### Leads Table
```sql
id, event_id, first_name, last_name, email, phone, state,
tax_problem, tax_jurisdiction, tax_data (JSON),
buyer_id, assigned_at, status, source, page_url,
fbclid, fbc, fbp, created_at, updated_at
```

### Buyers Table
```sql
id, name, email, phone_number, is_active, weight,
total_leads, last_assigned_at, created_at
```

---

## Troubleshooting

### Check Worker Logs
```bash
wrangler tail tax-peace-conversions
```

### Test Worker Directly
```bash
curl -X POST https://tax-peace-conversions.api-fivestartax.workers.dev/ \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User",...}'
```

### Reset Round-Robin Position
```bash
wrangler d1 execute tpn_crm --remote --command "UPDATE settings SET value = '0' WHERE key = 'round_robin_position'"
```

---

## Production URLs

- **Site:** TaxPeaceNow.com (check current deployment platform)
- **Worker:** https://tax-peace-conversions.api-fivestartax.workers.dev/
- **GitHub:** https://github.com/c-mathis/tpn-chatbot-funnel

---

## Files Modified
- `assets/wizard.js` - Updated worker endpoint URL
- `cloudflare-worker.js` - Removed Conversions API, fixed data extraction

**Commit:** ae94b32 - "Configure production deployment"
**Pushed:** 2026-04-02

---

✅ **System is ready to receive traffic. Update buyer info before launching ads.**
