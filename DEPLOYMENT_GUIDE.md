# TPN Cloudflare Worker Deployment Guide

## Overview

The `cloudflare-worker.js` has been enhanced with:
- **D1 lead storage** - All form submissions stored in database
- **Session-based buyer lookup** - Pre-assigned buyers from visitor sessions
- **Round-robin assignment fallback** - Auto-assign if no session exists
- **Existing Meta Conversions API** - Preserved unchanged

## File Changes

**File**: `/Users/beef/Repository/tpn-funnel/cloudflare-worker.js`

**Lines**: 297 (increased from 190)

**New Features**:
1. Session-based buyer lookup (lines 61-74)
2. D1 database insert for leads (lines 76-107)
3. Round-robin buyer assignment function (lines 253-297)

## Environment Bindings Required

### D1 Database
```bash
# Create D1 database
wrangler d1 create tpn-leads

# Apply schema
wrangler d1 execute tpn-leads --file=./workers/schema.sql
```

Bind in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "tpn-leads"
database_id = "your-database-id-here"
```

### KV Namespace
```bash
# Create KV namespace for sessions
wrangler kv:namespace create "SESSIONS_KV"
```

Bind in `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SESSIONS_KV"
id = "your-namespace-id-here"
```

### Secrets (Existing)
```bash
# Meta Conversions API (already configured)
wrangler secret put META_ACCESS_TOKEN
wrangler secret put META_PIXEL_ID

# Optional Google Sheets webhook
wrangler secret put GOOGLE_SHEETS_URL
```

## Complete wrangler.toml Example

```toml
name = "tpn-funnel-api"
main = "cloudflare-worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "tpn-leads"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[kv_namespaces]]
binding = "SESSIONS_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Secrets configured via wrangler secret put
# - META_ACCESS_TOKEN
# - META_PIXEL_ID
# - GOOGLE_SHEETS_URL (optional)
```

## Deployment Steps

### 1. Create Database & Namespace
```bash
# Create D1 database
wrangler d1 create tpn-leads

# Apply schema with seed data (2 buyers)
wrangler d1 execute tpn-leads --file=./workers/schema.sql

# Create KV namespace
wrangler kv:namespace create "SESSIONS_KV"
```

### 2. Update wrangler.toml
Copy the IDs from step 1 output into `wrangler.toml`:
- D1 database_id
- KV namespace id

### 3. Configure Secrets (if not already set)
```bash
wrangler secret put META_ACCESS_TOKEN
# Paste your Meta access token

wrangler secret put META_PIXEL_ID
# Paste your Meta pixel ID
```

### 4. Deploy
```bash
# Deploy worker
wrangler deploy

# Or publish (alias)
wrangler publish
```

### 5. Verify Bindings
```bash
# Check worker bindings
wrangler deployments list

# Test database connection
wrangler d1 execute tpn-leads --command "SELECT * FROM buyers"

# Expected output: 2 buyers with placeholder phone numbers
```

## Database Schema

See `/Users/beef/Repository/tpn-funnel/workers/schema.sql`

**Tables**:
- `leads` - All form submissions
- `buyers` - Resolution companies receiving leads
- `settings` - Round-robin position tracker
- `lead_events` - Audit trail (optional)

**Initial Data**:
- 2 buyers seeded with placeholder phones: (800) 555-0001, (800) 555-0002
- Round-robin position: 0

## How It Works

### Submission Flow

1. **Frontend** calls `POST /` with lead data including `session_id`
2. **Worker** checks SESSIONS_KV for pre-assigned buyer
3. **If found**: Use session buyer_id
4. **If not found**: Run round-robin assignment
5. **Store lead** in D1 with buyer assignment
6. **Send to Meta** Conversions API (existing logic)
7. **Return** success response

### Session-Based Assignment

**On page load** (separate endpoint - see crm-api.js):
```javascript
GET /api/assign-visitor
→ Assigns buyer via round-robin
→ Stores session:UUID in KV with buyer_id
→ Returns session_id + buyer_phone to frontend
```

**On submission** (this worker):
```javascript
POST / with { session_id, ...lead_data }
→ Looks up session in KV
→ Uses pre-assigned buyer_id
→ Stores lead in D1
```

### Round-Robin Logic

**Weighted distribution**:
- Buyer 1 weight=1, Buyer 2 weight=2
- Pool: [Buyer1, Buyer2, Buyer2]
- Position rotates: 0 → 1 → 2 → 0

**Stored in settings table**:
```sql
SELECT value FROM settings WHERE key = 'round_robin_position'
```

## Testing

### Test D1 Connection
```bash
# Check buyers
wrangler d1 execute tpn-leads --command "SELECT * FROM buyers"

# Check round-robin position
wrangler d1 execute tpn-leads --command "SELECT * FROM settings"

# Check leads (after submission)
wrangler d1 execute tpn-leads --command "SELECT * FROM leads ORDER BY created_at DESC LIMIT 5"
```

### Test KV Sessions
```bash
# List all session keys
wrangler kv:key list --binding=SESSIONS_KV

# Get specific session
wrangler kv:key get "session:YOUR-UUID-HERE" --binding=SESSIONS_KV
```

### Test Submission
```bash
curl -X POST https://your-worker.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-'$(date +%s)'",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "555-1234",
    "state": "CA",
    "debt_amount": "$10,001 - $20,000",
    "tax_type": "IRS",
    "session_id": "test-session-123",
    "page_url": "https://taxpeacenow.com"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "event_id": "test-1234567890",
  "meta_response": { ... }
}
```

## Monitoring

### Check Logs
```bash
wrangler tail
```

### Query Recent Leads
```bash
wrangler d1 execute tpn-leads --command "
  SELECT
    l.id, l.first_name, l.last_name, l.email,
    b.name as buyer_name, l.created_at
  FROM leads l
  LEFT JOIN buyers b ON l.buyer_id = b.id
  ORDER BY l.created_at DESC
  LIMIT 10
"
```

### Check Buyer Distribution
```bash
wrangler d1 execute tpn-leads --command "
  SELECT
    b.name,
    b.total_leads,
    COUNT(l.id) as actual_leads
  FROM buyers b
  LEFT JOIN leads l ON b.id = l.buyer_id
  GROUP BY b.id, b.name
"
```

## Updating Buyers

### Via CRM API (Recommended)
Use the `/api/buyers/:id` endpoint in `crm-api.js`:
```bash
# Update buyer phone
curl -X PUT https://your-crm-api.workers.dev/api/buyers/1 \
  -H "Authorization: Basic base64(admin:pass)" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "(800) 123-4567"}'

# Deactivate buyer
curl -X PUT https://your-crm-api.workers.dev/api/buyers/1 \
  -H "Authorization: Basic base64(admin:pass)" \
  -H "Content-Type: application/json" \
  -d '{"is_active": 0}'

# Change weight
curl -X PUT https://your-crm-api.workers.dev/api/buyers/1 \
  -H "Authorization: Basic base64(admin:pass)" \
  -H "Content-Type: application/json" \
  -d '{"weight": 3}'
```

### Direct SQL (Development Only)
```bash
# Update buyer phone
wrangler d1 execute tpn-leads --command "
  UPDATE buyers
  SET phone_number = '(800) 123-4567'
  WHERE id = 1
"

# Add new buyer
wrangler d1 execute tpn-leads --command "
  INSERT INTO buyers (name, phone_number, weight)
  VALUES ('New Company', '(800) 999-8888', 1)
"
```

## Troubleshooting

### Issue: "env.DB is undefined"
**Solution**: D1 binding not configured in wrangler.toml

### Issue: "env.SESSIONS_KV is undefined"
**Solution**: KV namespace not bound in wrangler.toml

### Issue: "No active buyers available"
**Solution**: Check buyers table has active buyers
```bash
wrangler d1 execute tpn-leads --command "SELECT * FROM buyers WHERE is_active = 1"
```

### Issue: Leads not storing
**Solution**: Check worker logs for SQL errors
```bash
wrangler tail
```

### Issue: Buyer assignment always null
**Solution**: Verify round_robin_position exists in settings
```bash
wrangler d1 execute tpn-leads --command "SELECT * FROM settings WHERE key = 'round_robin_position'"
```

## Migration Notes

### From Old Worker
**No changes required** on frontend if:
- Already sending `session_id` in submission payload
- Already sending `state` field

**Optional frontend updates**:
- None - worker handles missing session gracefully

### Rollback Plan
If issues occur:
1. Keep old worker as backup route
2. Deploy new worker to staging route first
3. Test thoroughly before production cutover

## Next Steps

1. Deploy both workers:
   - `cloudflare-worker.js` → Main conversion worker
   - `workers/crm-api.js` → CRM management API

2. Update frontend to call `/api/assign-visitor` on page load

3. Monitor lead distribution via CRM dashboard

4. Update buyer phone numbers from placeholders to real numbers

## Related Files

- `/Users/beef/Repository/tpn-funnel/cloudflare-worker.js` - Main conversion worker (this file)
- `/Users/beef/Repository/tpn-funnel/workers/crm-api.js` - CRM API for lead management
- `/Users/beef/Repository/tpn-funnel/workers/schema.sql` - Database schema
