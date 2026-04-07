# TPN Quick Setup Guide

## Status: Ready for Traffic ✅

Everything is deployed and working. Just 2 quick tasks before traffic starts.

---

## What's Already Done

✅ Database created and configured
✅ Conversion worker deployed: https://tax-peace-conversions.api-fivestartax.workers.dev
✅ CRM API deployed: https://tpn-crm-api.api-fivestartax.workers.dev
✅ Simple leads viewer created (no login needed)

---

## Before Traffic Starts (10 minutes)

### 1. Update Buyer Phone Numbers

Replace placeholder phone numbers with actual buyer contacts:

```bash
# Check current buyers
wrangler d1 execute tpn_crm --remote --command="SELECT * FROM buyers"

# Update buyer 1
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET name='Five Star Tax Relief', phone_number='(800) XXX-XXXX', email='leads@fivestartax.com' WHERE id=1"

# Update buyer 2
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET name='Second Resolution Company', phone_number='(800) XXX-XXXX', email='leads@company2.com' WHERE id=2"

# Verify
wrangler d1 execute tpn_crm --remote --command="SELECT * FROM buyers"
```

**Optional - Adjust Distribution:**
```bash
# Give one buyer more leads (e.g., 2:1 ratio)
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET weight=2 WHERE id=1"
```

---

### 2. Share Leads Viewer with Sales Team

The leads viewer is at: `/Users/beef/Repository/tpn-funnel/leads-simple.html`

**Option A: Deploy to Cloudflare Pages (Recommended)**
```bash
# Create directory and deploy
mkdir tpn-leads-viewer
cp leads-simple.html tpn-leads-viewer/index.html
cd tpn-leads-viewer
npx wrangler pages deploy . --project-name=tpn-leads

# Result: https://tpn-leads.pages.dev
```

**Option B: Email the HTML file**
The file is completely standalone. Sales team can:
1. Save it to their computer
2. Open it in any browser
3. It auto-refreshes every 30 seconds
4. No login required

**Option C: Add to main site**
```bash
# Copy to your web server
cp leads-simple.html /path/to/webserver/leads.html
```

---

## How It Works

**When someone submits the form:**
1. Form data sent to conversion worker
2. Worker stores lead in database
3. Round-robin assigns to buyer
4. Lead appears instantly in viewer

**Sales team views leads:**
1. Open leads-simple.html
2. See all leads in spreadsheet format
3. Click email/phone to contact
4. Filter by status, buyer, or date
5. Auto-refreshes every 30 seconds

---

## Viewing Leads

### Via Browser (Simple Viewer)
- Opens in any browser
- Shows all leads in table format
- Auto-refreshes every 30 seconds
- Filter by status, buyer, date
- No login needed

### Via Command Line
```bash
# View recent leads
wrangler d1 execute tpn_crm --remote --command="SELECT first_name, last_name, email, phone, state, created_at FROM leads ORDER BY created_at DESC LIMIT 10"

# Count today's leads
wrangler d1 execute tpn_crm --remote --command="SELECT COUNT(*) as count FROM leads WHERE DATE(created_at) = DATE(CURRENT_TIMESTAMP)"

# Export to CSV
wrangler d1 execute tpn_crm --remote --command="SELECT * FROM leads" --json > leads-export.json
```

---

## Monitor Live Traffic

```bash
# Watch conversion worker (form submissions)
wrangler tail tax-peace-conversions

# Watch CRM API (dashboard requests)
wrangler tail tpn-crm-api --config workers/wrangler-crm.toml
```

---

## Quick Commands

**Check lead count:**
```bash
wrangler d1 execute tpn_crm --remote --command="SELECT COUNT(*) FROM leads"
```

**Check buyer distribution:**
```bash
wrangler d1 execute tpn_crm --remote --command="SELECT b.name, COUNT(l.id) as leads FROM buyers b LEFT JOIN leads l ON b.id = l.buyer_id GROUP BY b.name"
```

**Pause a buyer:**
```bash
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET is_active=0 WHERE id=1"
```

**Resume a buyer:**
```bash
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET is_active=1 WHERE id=1"
```

---

## Files Reference

- `leads-simple.html` - Simple spreadsheet-style leads viewer (no login)
- `leads-dashboard.html` - Full dashboard with login (for later if needed)
- `cloudflare-worker.js` - Conversion worker (handles form submissions)
- `workers/crm-api.js` - CRM API (provides lead data)
- `workers/schema.sql` - Database structure

---

## Support

**If leads aren't showing up:**
1. Check worker logs: `wrangler tail tax-peace-conversions`
2. Check database: `wrangler d1 execute tpn_crm --remote --command="SELECT COUNT(*) FROM leads"`
3. Check API: `curl https://tpn-crm-api.api-fivestartax.workers.dev/api/metrics`

**Ready to go! Complete the 2 tasks above and you're all set for traffic.**
