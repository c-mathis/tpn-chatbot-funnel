# TPN CRM System - Setup & Deployment Guide

Complete custom CRM dashboard for Tax Peace Now with round-robin lead distribution between two buyers.

## Features

- ✅ **Pre-Assignment on Page Load** - Buyers assigned when visitor first lands on site
- ✅ **Dynamic Phone Display** - Shows buyer-specific phone number throughout funnel
- ✅ **Round-Robin Distribution** - Configurable weighted distribution (50/50 default)
- ✅ **Lead Storage** - All submissions stored in Cloudflare D1 (SQLite)
- ✅ **Admin Dashboard** - Monitor leads, update statuses, manage buyers, export CSV
- ✅ **Session Tracking** - Persistent visitor → buyer assignment via Workers KV
- ✅ **Zero Cost** - Runs entirely on Cloudflare free tier

---

## Quick Start (5 Minutes)

```bash
cd /Users/beef/Repository/tpn-funnel

# 1. Database already created (✓)
# D1 ID: f8be108b-1ee4-4eef-91e5-41bcdc323abc

# 2. KV Namespace already created (✓)
# KV ID: 43ebe6d1074249bf83b89fd4a1b5e990

# 3. Deploy CRM API Worker
wrangler deploy workers/crm-api.js --name tpn-crm-api

# 4. Deploy enhanced submission worker
wrangler deploy cloudflare-worker.js

# 5. Set admin credentials
wrangler secret put ADMIN_USER --name tpn-crm-api
wrangler secret put ADMIN_PASS --name tpn-crm-api

# 6. Update buyer phone numbers
wrangler d1 execute tpn_crm --command="UPDATE buyers SET phone_number = '(800) 123-4567' WHERE id = 1"
wrangler d1 execute tpn_crm --command="UPDATE buyers SET phone_number = '(800) 987-6543' WHERE id = 2"

# 7. Update API URLs in frontend
# Edit: src/index.njk (line 353) - Replace YOUR_SUBDOMAIN
# Edit: admin/assets/dashboard.js (line 2) - Replace YOUR_SUBDOMAIN

# 8. Deploy site
git add .
git commit -m "Add TPN CRM system with round-robin distribution"
git push origin main
```

Your CRM is now live! 🎉

---

## Architecture

### Components

1. **CRM API Worker** (`workers/crm-api.js`)
   - Handles visitor pre-assignment
   - Provides REST API for dashboard
   - Manages round-robin distribution

2. **Submission Worker** (`cloudflare-worker.js`)
   - Stores leads in D1 database
   - Links submissions to pre-assigned buyers
   - Sends to Meta Conversions API (existing)

3. **D1 Database** (`tpn_crm`)
   - **leads** - All form submissions
   - **buyers** - Resolution companies
   - **settings** - Round-robin state
   - **lead_events** - Audit trail

4. **Workers KV** (`SESSIONS_KV`)
   - Stores visitor → buyer mappings
   - 24-hour expiry

5. **Admin Dashboard** (`admin/`)
   - View and filter leads
   - Update lead statuses
   - Manage buyer settings
   - Export CSV

### Data Flow

```
Visitor lands on page
  ↓
GET /api/assign-visitor
  ↓
Round-robin assigns buyer
  ↓
Session stored in KV (24h)
  ↓
Phone number displayed
  ↓
Visitor submits form
  ↓
POST with session_id
  ↓
Lead stored in D1 with buyer_id
  ↓
Sent to Meta API
  ↓
Dashboard displays lead
```

---

## Configuration

### Update Buyer Phone Numbers

```bash
# Resolution Company 1
wrangler d1 execute tpn_crm --command="UPDATE buyers SET phone_number = '(800) 123-4567' WHERE id = 1"

# Resolution Company 2
wrangler d1 execute tpn_crm --command="UPDATE buyers SET phone_number = '(800) 987-6543' WHERE id = 2"

# Verify
wrangler d1 execute tpn_crm --command="SELECT * FROM buyers"
```

### Adjust Round-Robin Weights

Equal distribution (50/50):
```bash
wrangler d1 execute tpn_crm --command="UPDATE buyers SET weight = 1 WHERE id IN (1,2)"
```

Give Buyer 2 twice as many leads (33/67):
```bash
wrangler d1 execute tpn_crm --command="UPDATE buyers SET weight = 1 WHERE id = 1"
wrangler d1 execute tpn_crm --command="UPDATE buyers SET weight = 2 WHERE id = 2"
```

### Pause/Resume Buyers

```bash
# Pause Buyer 1 (all leads go to Buyer 2)
wrangler d1 execute tpn_crm --command="UPDATE buyers SET is_active = 0 WHERE id = 1"

# Resume Buyer 1
wrangler d1 execute tpn_crm --command="UPDATE buyers SET is_active = 1 WHERE id = 1"
```

### Update API URLs

**1. Frontend Pre-Assignment** (`src/index.njk` line 353):
```javascript
const response = await fetch('https://tpn-crm-api.YOUR_SUBDOMAIN.workers.dev/api/assign-visitor');
```
Replace `YOUR_SUBDOMAIN` with your actual Cloudflare Workers subdomain.

**2. Admin Dashboard** (`admin/assets/dashboard.js` line 2):
```javascript
const CONFIG = {
  API_BASE: 'https://tpn-crm-api.YOUR_SUBDOMAIN.workers.dev',
  ...
};
```

To find your subdomain:
```bash
wrangler deploy workers/crm-api.js --name tpn-crm-api
# Output will show: Published tpn-crm-api at https://tpn-crm-api.<subdomain>.workers.dev
```

---

## Database Queries

### View All Leads
```bash
wrangler d1 execute tpn_crm --command="SELECT id, first_name, last_name, email, phone, buyer_id, status, created_at FROM leads ORDER BY created_at DESC LIMIT 10"
```

### Count Leads by Buyer
```bash
wrangler d1 execute tpn_crm --command="
SELECT
  b.name as buyer,
  COUNT(l.id) as total_leads
FROM buyers b
LEFT JOIN leads l ON b.id = l.buyer_id
GROUP BY b.id"
```

### Today's Leads
```bash
wrangler d1 execute tpn_crm --command="
SELECT COUNT(*) as today_count
FROM leads
WHERE DATE(created_at) = DATE('now')"
```

### Leads by Status
```bash
wrangler d1 execute tpn_crm --command="
SELECT status, COUNT(*) as count
FROM leads
GROUP BY status"
```

### Export All Leads (CSV)
Use the admin dashboard or:
```bash
wrangler d1 execute tpn_crm --command="
SELECT
  id, event_id, first_name, last_name, email, phone, state,
  tax_problem, tax_jurisdiction, buyer_id, status, created_at
FROM leads
ORDER BY created_at DESC" --json > leads_export.json
```

---

## Admin Dashboard

### Access
Navigate to: `https://yourdomain.com/admin/`

### Features

**Metrics**:
- Total Leads
- Today's Leads
- Buyer Distribution (%)

**Lead Management**:
- Filter by date, buyer, status
- Sort by any column
- Update status inline
- View full details
- Export to CSV

**Buyer Settings**:
- Toggle active/paused
- Adjust distribution weights
- View total assigned leads

### Authentication

Uses HTTP Basic Auth:
- Username: Set via `wrangler secret put ADMIN_USER`
- Password: Set via `wrangler secret put ADMIN_PASS`

---

## Testing

### Test Pre-Assignment

1. Open browser DevTools (Network tab)
2. Load homepage
3. Look for request to `/api/assign-visitor`
4. Check Response:
   ```json
   {
     "session_id": "uuid-here",
     "buyer_phone": "(800) 555-0001",
     "buyer_name": "Resolution Company 1"
   }
   ```
5. Check localStorage for `tpn_session`
6. Verify phone number updates on page

### Test Round-Robin

1. Open 10 incognito windows
2. Load homepage in each
3. Check localStorage `buyer_phone` in each
4. Should alternate between Buyer 1 and Buyer 2

### Test Form Submission

1. Fill out chatbot assessment
2. Submit form
3. Check Network tab for POST to worker
4. Verify payload includes `session_id`
5. Check D1 database:
   ```bash
   wrangler d1 execute tpn_crm --command="SELECT * FROM leads ORDER BY created_at DESC LIMIT 1"
   ```
6. Verify `buyer_id` matches pre-assigned buyer

### Test Dashboard

1. Navigate to `/admin/`
2. Login with admin credentials
3. Verify metrics display correctly
4. Filter leads by buyer
5. Update a lead status
6. Export CSV
7. Toggle buyer active/paused
8. Adjust buyer weight
9. Verify changes reflected in database

---

## Troubleshooting

### Phone Numbers Not Updating

**Symptoms**: Default "(800) 555-0000" shows instead of buyer phone

**Solutions**:
1. Check API URL is correct in `src/index.njk`
2. Check browser console for CORS errors
3. Verify CRM API worker is deployed:
   ```bash
   curl https://tpn-crm-api.YOUR_SUBDOMAIN.workers.dev/api/assign-visitor
   ```
4. Check KV namespace binding in `wrangler.toml`

### Leads Not Storing in Database

**Symptoms**: Dashboard shows no leads, D1 queries return empty

**Solutions**:
1. Check D1 binding in `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_id = "f8be108b-1ee4-4eef-91e5-41bcdc323abc"
   ```
2. Verify schema was applied:
   ```bash
   wrangler d1 execute tpn_crm --command="SELECT name FROM sqlite_master WHERE type='table'"
   ```
3. Check worker logs:
   ```bash
   wrangler tail cloudflare-worker
   ```

### Round-Robin Not Distributing Evenly

**Symptoms**: One buyer getting all leads

**Solutions**:
1. Check buyer `is_active` status:
   ```bash
   wrangler d1 execute tpn_crm --command="SELECT * FROM buyers"
   ```
2. Verify weights are equal:
   ```bash
   wrangler d1 execute tpn_crm --command="UPDATE buyers SET weight = 1 WHERE id IN (1,2)"
   ```
3. Reset round-robin position:
   ```bash
   wrangler d1 execute tpn_crm --command="UPDATE settings SET value = '0' WHERE key = 'round_robin_position'"
   ```

### Dashboard 401 Unauthorized

**Symptoms**: Can't login to admin dashboard

**Solutions**:
1. Verify secrets are set:
   ```bash
   wrangler secret put ADMIN_USER --name tpn-crm-api
   wrangler secret put ADMIN_PASS --name tpn-crm-api
   ```
2. Check credentials match in dashboard login
3. Clear browser cache and try again

---

## Cost Analysis

### Cloudflare Free Tier

**Workers**:
- Limit: 100,000 requests/day
- Usage: ~300/day (50 visitors × 6 requests)
- Cost: $0/month ✅

**Workers KV**:
- Limit: 1,000 writes/day, 100,000 reads/day
- Usage: ~50 writes/day, ~200 reads/day
- Cost: $0/month ✅

**D1 Database**:
- Limit: 100,000 writes/day, 5M reads/day
- Usage: ~50 writes/day, ~10,000 reads/day
- Cost: $0/month ✅

**Cloudflare Pages**:
- Limit: Unlimited bandwidth, 500 builds/month
- Usage: ~5 builds/month
- Cost: $0/month ✅

**Total Infrastructure Cost: $0/month**

### vs Alternatives

- **Airtable**: $20-50/month
- **HubSpot**: $50-100+/month
- **Salesforce**: $100+/month

**Annual Savings**: $240-1,200/year

---

## Security

### Authentication
- Admin dashboard uses HTTP Basic Auth over HTTPS
- Credentials stored as Worker secrets (not in code)
- Session tokens in KV expire after 24 hours

### Data Protection
- All traffic over HTTPS (TLS 1.3)
- D1 database encrypted at rest
- PII hashed in Meta API calls
- No sensitive data in logs

### Access Control
- Dashboard: Admin-only
- API endpoints: Authenticated requests only
- Visitor assignment: Public (no sensitive data)

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review lead distribution in dashboard
- Check buyer performance (conversion rates)
- Export leads to CRM or spreadsheet

**Monthly**:
- Audit buyer settings (weights, active status)
- Review database size: `wrangler d1 execute tpn_crm --command="SELECT * FROM pragma_database_list"`
- Check error logs: `wrangler tail`

**Quarterly**:
- Update buyer phone numbers if changed
- Review and archive old leads (>90 days)
- Performance tuning (add indexes if needed)

### Backup

**Manual Export**:
```bash
# Export all leads
wrangler d1 export tpn_crm --output backup_$(date +%Y%m%d).sql

# Or via API
curl -u admin:password https://tpn-crm-api.YOUR_SUBDOMAIN.workers.dev/api/export?start_date=2026-01-01&end_date=2026-12-31 > leads_backup.csv
```

**Automated Backups** (future):
- Set up Cloudflare Cron Trigger to export weekly
- Store in R2 or send to Google Drive via API

---

## Future Enhancements

### Email Notifications
- Send lead details to assigned buyer via email
- Use Cloudflare Email Workers or SendGrid
- Include: lead name, contact, tax problem, urgency

### Lead Scoring
- Score leads based on debt amount + urgency + likelihood
- Prioritize high-value leads in dashboard
- Adjust round-robin weights based on score

### Advanced Analytics
- Conversion funnel visualization
- Buyer performance comparison charts
- State heatmap of lead sources
- Tax problem distribution pie chart

### Integrations
- **Instantly.ai**: Webhook for email outreach campaigns
- **Zapier/Make.com**: Connect to 1000+ apps
- **Twilio**: SMS notifications for new leads
- **Slack**: Post new lead notifications to channel

---

## Support

For questions or issues:
1. Check this README
2. Review documentation in agents' summaries
3. Check Cloudflare Workers logs: `wrangler tail`
4. Query database directly for debugging

---

## Files Modified

### New Files
- `workers/schema.sql` - D1 database schema
- `workers/crm-api.js` - CRM API Worker
- `admin/index.html` - Dashboard UI
- `admin/assets/dashboard.css` - Dashboard styles
- `admin/assets/dashboard.js` - Dashboard logic

### Modified Files
- `wrangler.toml` - Added D1 and KV bindings
- `cloudflare-worker.js` - Added lead storage and session lookup
- `src/index.njk` - Added pre-assignment script
- `src/assets/wizard.js` - Added session_id to submission
- `src/thank-you.njk` - Added dynamic phone display

---

## Version

**v1.0.0** - Initial release (2026-03-26)

- Round-robin lead distribution
- Pre-assignment on page load
- Dynamic phone number display
- Admin dashboard with full lead management
- Zero-cost infrastructure

---

**Built with ❤️ for Tax Peace Now**
