# TPN Lead Storage - Quick Start

## What Changed

The `cloudflare-worker.js` now stores all leads in a D1 database with automatic buyer assignment.

**Before**: Form → Meta API only
**After**: Form → D1 Database + Meta API

## 5-Minute Deployment

### 1. Create Database
```bash
cd /Users/beef/Repository/tpn-funnel
wrangler d1 create tpn-leads
```
Copy the database_id from output.

### 2. Apply Schema
```bash
wrangler d1 execute tpn-leads --file=./workers/schema.sql
```
This creates tables and seeds 2 placeholder buyers.

### 3. Create KV Namespace
```bash
wrangler kv:namespace create "SESSIONS_KV"
```
Copy the id from output.

### 4. Update wrangler.toml
Create or update `wrangler.toml`:
```toml
name = "tpn-conversion-api"
main = "cloudflare-worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "tpn-leads"
database_id = "paste-database-id-here"

[[kv_namespaces]]
binding = "SESSIONS_KV"
id = "paste-namespace-id-here"
```

### 5. Deploy
```bash
wrangler deploy
```

Done! Your worker now stores leads in D1.

## Verify It Works

### Check Database
```bash
# View buyers
wrangler d1 execute tpn-leads --command "SELECT * FROM buyers"

# View recent leads (after a submission)
wrangler d1 execute tpn-leads --command "SELECT * FROM leads ORDER BY created_at DESC LIMIT 5"
```

### Test Submission
```bash
curl -X POST https://your-worker.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "state": "CA",
    "debt_amount": "$10,001 - $20,000",
    "tax_type": "IRS",
    "page_url": "https://taxpeacenow.com"
  }'
```

Expected response:
```json
{
  "success": true,
  "event_id": "test-123",
  "meta_response": { ... }
}
```

## Update Buyer Phone Numbers

The schema seeds 2 buyers with placeholder phones. Update them:

```bash
# Buyer 1
wrangler d1 execute tpn-leads --command "UPDATE buyers SET phone_number = '(800) 123-4567', name = 'ABC Tax Relief' WHERE id = 1"

# Buyer 2
wrangler d1 execute tpn-leads --command "UPDATE buyers SET phone_number = '(888) 999-8888', name = 'XYZ Tax Solutions' WHERE id = 2"
```

## Environment Variables

Your worker needs these bindings:

| Binding | Type | Purpose | Required |
|---------|------|---------|----------|
| DB | D1 Database | Lead storage | Yes |
| SESSIONS_KV | KV Namespace | Session tracking | Yes |
| META_ACCESS_TOKEN | Secret | Meta API auth | Yes |
| META_PIXEL_ID | Secret | Meta Pixel ID | Yes |
| GOOGLE_SHEETS_URL | Secret | Optional webhook | No |

Set secrets:
```bash
wrangler secret put META_ACCESS_TOKEN
wrangler secret put META_PIXEL_ID
```

## Common Issues

### "env.DB is undefined"
**Fix**: Add D1 binding to wrangler.toml (see step 4)

### "env.SESSIONS_KV is undefined"
**Fix**: Add KV binding to wrangler.toml (see step 4)

### "No active buyers available"
**Fix**: Check buyers table has active buyers:
```bash
wrangler d1 execute tpn-leads --command "SELECT * FROM buyers WHERE is_active = 1"
```

### Leads not storing
**Fix**: Check worker logs for errors:
```bash
wrangler tail
```

## What's Next

1. **Update buyer phones** - Replace placeholder numbers (see above)
2. **Deploy CRM API** - See `workers/crm-api.js` for lead management dashboard
3. **Update frontend** - Add session_id to submission payload (optional)
4. **Monitor leads** - Query D1 or use CRM API endpoints

## File Reference

| File | Purpose |
|------|---------|
| [cloudflare-worker.js](cloudflare-worker.js) | Main conversion worker (enhanced) |
| [workers/crm-api.js](workers/crm-api.js) | CRM API for lead management |
| [workers/schema.sql](workers/schema.sql) | Database schema |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Detailed deployment steps |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full system architecture |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

## Quick Commands Cheat Sheet

```bash
# Deploy worker
wrangler deploy

# Watch logs
wrangler tail

# View recent leads
wrangler d1 execute tpn-leads --command "SELECT id, first_name, last_name, email, phone, created_at FROM leads ORDER BY created_at DESC LIMIT 10"

# View buyer distribution
wrangler d1 execute tpn-leads --command "SELECT b.name, COUNT(l.id) as leads FROM buyers b LEFT JOIN leads l ON b.id = l.buyer_id GROUP BY b.name"

# Add new buyer
wrangler d1 execute tpn-leads --command "INSERT INTO buyers (name, phone_number, weight) VALUES ('New Company', '(800) 555-9999', 1)"

# Deactivate buyer
wrangler d1 execute tpn-leads --command "UPDATE buyers SET is_active = 0 WHERE id = 2"

# Change buyer weight
wrangler d1 execute tpn-leads --command "UPDATE buyers SET weight = 3 WHERE id = 1"

# Export leads to CSV
curl https://crm.taxpeacenow.com/api/export \
  -H "Authorization: Basic $(echo -n 'admin:pass' | base64)" \
  > leads.csv
```

## Need Help?

- Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
- Check worker logs: `wrangler tail`
- Query database directly: `wrangler d1 execute tpn-leads --command "..."`
