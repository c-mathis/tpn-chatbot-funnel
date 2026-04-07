# TPN Launch Checklist

## Status: Ready for Traffic ✅

Both workers deployed and database is ready. Follow the steps below to complete setup.

---

## Deployed URLs

- **Conversion Worker**: https://tax-peace-conversions.api-fivestartax.workers.dev
- **CRM API Worker**: https://tpn-crm-api.api-fivestartax.workers.dev
- **Leads Dashboard**: `/leads-dashboard.html` (needs to be uploaded - see step 3)

---

## Pre-Launch Tasks (Complete These Before Traffic Starts)

### 1. Set Admin Credentials for Dashboard

The dashboard uses HTTP Basic Auth. Set credentials now:

```bash
# Set username (e.g., "admin", "tpn", "sales")
wrangler secret put ADMIN_USER --config workers/wrangler-crm.toml

# Set strong password
wrangler secret put ADMIN_PASS --config workers/wrangler-crm.toml
```

After setting these, the sales team can log into the dashboard using these credentials.

---

### 2. Update Buyer Information

The database has placeholder phone numbers. Update them with the actual buyer information:

```bash
# Check current buyers
wrangler d1 execute tpn_crm --remote --command="SELECT * FROM buyers"

# Update buyer 1 info
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET name='ACTUAL COMPANY NAME 1', phone_number='(XXX) XXX-XXXX', email='buyer1@example.com' WHERE id=1"

# Update buyer 2 info
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET name='ACTUAL COMPANY NAME 2', phone_number='(XXX) XXX-XXXX', email='buyer2@example.com' WHERE id=2"

# Verify changes
wrangler d1 execute tpn_crm --remote --command="SELECT * FROM buyers"
```

**Optional**: Adjust buyer weights for different distribution:
```bash
# Example: Give buyer 2 twice as many leads (2:1 ratio)
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET weight=2 WHERE id=2"
```

---

### 3. Deploy Leads Dashboard

The dashboard HTML needs to be accessible to the sales team. Choose one option:

#### Option A: Cloudflare Pages (Recommended)
```bash
# Create a new directory for the dashboard
mkdir tpn-dashboard
cp leads-dashboard.html tpn-dashboard/index.html

# Deploy to Cloudflare Pages
cd tpn-dashboard
npx wrangler pages deploy . --project-name=tpn-dashboard

# Result: https://tpn-dashboard.pages.dev
```

#### Option B: Add to main site with password protection
```bash
# Copy dashboard to site
cp leads-dashboard.html /path/to/main/site/admin/leads.html

# Add password protection in Cloudflare Access or via .htaccess
```

#### Option C: Send directly to sales team
The dashboard is a single HTML file. You can email it directly to the sales team. They just need to:
1. Save the file to their computer
2. Open it in their browser
3. Enter API URL: `https://tpn-crm-api.api-fivestartax.workers.dev`
4. Login with credentials from Step 1

---

### 4. Update Frontend to Use Conversion Worker

If not already done, update the form submission in `index.html` to point to the conversion worker:

```javascript
// In index.html, find the form submission code and update:
const response = await fetch('https://tax-peace-conversions.api-fivestartax.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});
```

Also update the session assignment call:
```javascript
// On page load, assign buyer:
const sessionResponse = await fetch('https://tpn-crm-api.api-fivestartax.workers.dev/api/assign-visitor');
const { session_id, buyer_phone } = await sessionResponse.json();
```

---

### 5. Test Complete Flow

Before traffic hits, test end-to-end:

```bash
# 1. Visit the site and submit a test lead
# 2. Check the database for the lead:
wrangler d1 execute tpn_crm --remote --command="SELECT * FROM leads ORDER BY created_at DESC LIMIT 1"

# 3. Login to dashboard and verify lead appears
# 4. Test filtering and status updates
```

---

## Post-Launch Monitoring

### Daily Checks

**View today's leads:**
```bash
wrangler d1 execute tpn_crm --remote --command="SELECT COUNT(*) as count, status FROM leads WHERE DATE(created_at) = DATE(CURRENT_TIMESTAMP) GROUP BY status"
```

**Check buyer distribution:**
```bash
wrangler d1 execute tpn_crm --remote --command="SELECT b.name, COUNT(l.id) as leads FROM buyers b LEFT JOIN leads l ON b.id = l.buyer_id GROUP BY b.name"
```

**View recent leads:**
```bash
wrangler d1 execute tpn_crm --remote --command="SELECT first_name, last_name, email, phone, state, status, created_at FROM leads ORDER BY created_at DESC LIMIT 10"
```

### Monitor Worker Logs

**Watch conversion worker:**
```bash
wrangler tail tax-peace-conversions
```

**Watch CRM API worker:**
```bash
wrangler tail tpn-crm-api --config workers/wrangler-crm.toml
```

### Dashboard Access

Sales team can access the dashboard at any time to:
- View all leads in real-time
- Filter by status, buyer, or date
- See lead details including tax situation
- Export leads to CSV
- Track daily metrics

---

## Database Schema Reference

### Leads Table
- **id**: Auto-increment primary key
- **event_id**: Unique tracking ID
- **first_name, last_name, email, phone, state**: Contact info
- **tax_problem, tax_jurisdiction**: Primary tax situation
- **tax_data**: JSON with additional details (debt_amount, tax_type, employment_status, etc.)
- **buyer_id**: Assigned buyer (foreign key)
- **status**: new, contacted, qualified, converted, lost
- **source**: Traffic source
- **created_at, updated_at**: Timestamps

### Buyers Table
- **id**: Auto-increment primary key
- **name**: Company name
- **email**: Buyer contact email
- **phone_number**: Phone number for assignment
- **is_active**: 1=active, 0=paused
- **weight**: Distribution weight (higher = more leads)
- **total_leads**: Counter for tracking

---

## Emergency Procedures

### Pause a Buyer
```bash
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET is_active=0 WHERE id=1"
```

### Re-enable a Buyer
```bash
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET is_active=1 WHERE id=1"
```

### Export All Leads
```bash
# Via dashboard: Click "Export" button
# Via CLI:
wrangler d1 execute tpn_crm --remote --command="SELECT * FROM leads" --json > leads-export.json
```

### Check for Issues
```bash
# Leads with no buyer assignment
wrangler d1 execute tpn_crm --remote --command="SELECT COUNT(*) FROM leads WHERE buyer_id IS NULL"

# Duplicate submissions (same email)
wrangler d1 execute tpn_crm --remote --command="SELECT email, COUNT(*) as count FROM leads GROUP BY email HAVING count > 1"
```

---

## Custom Domains (Optional)

If you want custom domains for the workers:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click on worker name
3. Go to Settings → Triggers
4. Add custom domain:
   - `conversion.taxpeacenow.com` → tax-peace-conversions
   - `crm.taxpeacenow.com` → tpn-crm-api

---

## Support

**Worker Logs**: Check Cloudflare Dashboard → Workers & Pages → [worker] → Logs
**Database Console**: Cloudflare Dashboard → D1 → tpn_crm
**Issues**: Check `/Users/beef/Repository/tpn-funnel/ARCHITECTURE.md` for troubleshooting

---

## Current Status

✅ Database created and schema deployed
✅ Conversion worker deployed
✅ CRM API worker deployed
✅ Leads dashboard HTML created
✅ Both buyers configured (needs real phone numbers)

⏳ Pending:
- [ ] Set admin credentials (Step 1)
- [ ] Update buyer phone numbers (Step 2)
- [ ] Deploy leads dashboard (Step 3)
- [ ] Test complete flow (Step 5)

**Ready for traffic after completing pending tasks above.**
