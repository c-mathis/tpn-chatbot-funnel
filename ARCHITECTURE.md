# TPN Lead Management Architecture

## System Overview

Tax Peace Now uses a multi-worker architecture for lead capture, assignment, and management:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  (index.html + chatbot.js)                                       │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
         Page Load                      Form Submit
                │                             │
                v                             v
┌───────────────────────────┐   ┌─────────────────────────────────┐
│   CRM API Worker          │   │  Conversion Worker              │
│   (crm-api.js)            │   │  (cloudflare-worker.js)         │
│                           │   │                                 │
│  GET /api/assign-visitor  │   │  POST /                         │
│  → Assign buyer           │   │  → Store lead in D1             │
│  → Store in KV            │   │  → Send to Meta API             │
│  → Return session_id      │   │  → Return success               │
└───────────────┬───────────┘   └──────────────┬──────────────────┘
                │                              │
                └──────────────┬───────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Shared Resources  │
                    │                     │
                    │  - D1 Database      │
                    │  - KV Namespace     │
                    │  - Meta Pixel       │
                    └─────────────────────┘
```

## Components

### 1. Frontend (Static HTML)

**File**: `/Users/beef/Repository/tpn-funnel/index.html`

**Responsibilities**:
- Render chatbot interface
- Call `/api/assign-visitor` on page load
- Store session_id in memory
- Submit form with session_id on completion

**Flow**:
```javascript
// On page load
const response = await fetch('https://crm-api.workers.dev/api/assign-visitor');
const { session_id, buyer_phone } = await response.json();

// Store for later
sessionStorage.setItem('tpn_session_id', session_id);
sessionStorage.setItem('tpn_buyer_phone', buyer_phone);

// On form submission
const payload = {
  ...formData,
  session_id: sessionStorage.getItem('tpn_session_id'),
  event_id: generateEventId(),
  fbclid, fbc, fbp // Facebook tracking params
};

await fetch('https://conversion-worker.workers.dev', {
  method: 'POST',
  body: JSON.stringify(payload)
});
```

### 2. CRM API Worker

**File**: `/Users/beef/Repository/tpn-funnel/workers/crm-api.js`

**Responsibilities**:
- Pre-assign buyers on page load
- Manage leads (list, update status)
- Manage buyers (list, update weight/active status)
- Export leads to CSV
- Provide dashboard metrics

**Endpoints**:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/assign-visitor` | GET | None | Pre-assign buyer, store session |
| `/api/leads` | GET | Basic | List leads with filters |
| `/api/leads/:id` | PUT | Basic | Update lead status |
| `/api/buyers` | GET | Basic | List all buyers |
| `/api/buyers/:id` | PUT | Basic | Update buyer settings |
| `/api/export` | GET | Basic | CSV export |
| `/api/metrics` | GET | Basic | Dashboard stats |

**Session Storage** (KV):
```json
{
  "buyer_id": 1,
  "buyer_phone": "(800) 555-0001",
  "buyer_name": "Resolution Company 1",
  "assigned_at": "2026-03-26T10:30:00Z"
}
```
- **Key**: `session:{uuid}`
- **TTL**: 24 hours
- **Purpose**: Connect page visitor to eventual lead submission

### 3. Conversion Worker

**File**: `/Users/beef/Repository/tpn-funnel/cloudflare-worker.js`

**Responsibilities**:
- Receive form submissions
- Look up buyer from session (or assign if missing)
- Store lead in D1 database
- Send conversion to Meta API
- Optional: Send to Google Sheets

**Input Payload**:
```json
{
  "event_id": "unique-event-id",
  "session_id": "uuid-from-page-load",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "state": "CA",
  "debt_amount": "$10,001 - $20,000",
  "tax_type": "IRS",
  "employment_status": "Self-employed",
  "collection_actions": "Yes",
  "unfiled_years": "2-3 years",
  "contactTime": "Morning",
  "page_url": "https://taxpeacenow.com",
  "source": "Tax Peace Now Chatbot",
  "fbclid": "...",
  "fbc": "...",
  "fbp": "..."
}
```

**Database Insert**:
```sql
INSERT INTO leads (
  event_id, first_name, last_name, email, phone, state,
  tax_problem, tax_jurisdiction, tax_data,
  buyer_id, assigned_at, status, source, page_url,
  fbclid, fbc, fbp
) VALUES (...)
```

**Meta Conversions API**:
```json
{
  "data": [{
    "event_name": "CompleteRegistration",
    "event_time": 1234567890,
    "event_id": "unique-event-id",
    "event_source_url": "https://taxpeacenow.com",
    "action_source": "website",
    "user_data": {
      "em": ["hashed-email"],
      "ph": ["hashed-phone"],
      "fn": ["hashed-first"],
      "ln": ["hashed-last"],
      "client_ip_address": "...",
      "client_user_agent": "...",
      "fbc": "...",
      "fbp": "..."
    },
    "custom_data": {
      "content_name": "Tax Resolution Assessment",
      "value": 15000,
      "currency": "USD",
      "debt_amount": "$10,001 - $20,000",
      "tax_type": "IRS"
    }
  }]
}
```

## Database Schema

### leads
```sql
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT UNIQUE NOT NULL,

  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  state TEXT NOT NULL,

  -- Tax Situation
  tax_problem TEXT,
  tax_jurisdiction TEXT,
  tax_data JSON,  -- Flexible storage for conditional fields

  -- Lead Assignment
  buyer_id INTEGER,
  assigned_at TIMESTAMP,
  status TEXT DEFAULT 'new',  -- new, contacted, qualified, closed, lost

  -- Metadata
  source TEXT DEFAULT 'Tax Peace Now Chatbot',
  page_url TEXT,
  fbclid TEXT,
  fbc TEXT,
  fbp TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (buyer_id) REFERENCES buyers(id)
);
```

### buyers
```sql
CREATE TABLE buyers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  is_active INTEGER DEFAULT 1,     -- 0=paused, 1=active
  weight INTEGER DEFAULT 1,         -- For weighted round-robin distribution
  total_leads INTEGER DEFAULT 0,   -- Counter for tracking
  last_assigned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### settings
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Round-robin position tracker
INSERT INTO settings (key, value) VALUES ('round_robin_position', '0');
```

### lead_events (optional)
```sql
CREATE TABLE lead_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,  -- assigned, status_change, note
  event_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
```

## Round-Robin Assignment Logic

### Algorithm

**Weighted distribution** ensures fair but configurable lead allocation:

```javascript
// Example: 2 buyers
// Buyer 1: weight=1, Buyer 2: weight=2

// Build weighted pool
const pool = [
  buyer1,  // weight 1: appears 1x
  buyer2,  // weight 2: appears 2x
  buyer2
];

// Rotate position: 0 → 1 → 2 → 0
const buyer = pool[position % pool.length];
position = (position + 1) % pool.length;
```

**Result**:
- Visitor 1: Buyer 1
- Visitor 2: Buyer 2
- Visitor 3: Buyer 2
- Visitor 4: Buyer 1
- Visitor 5: Buyer 2
- Visitor 6: Buyer 2
- (repeats)

**Distribution**: Buyer 1 gets 33%, Buyer 2 gets 67%

### State Management

**Position stored in settings table**:
```sql
SELECT value FROM settings WHERE key = 'round_robin_position'
```

**Updated atomically after each assignment**:
```sql
INSERT INTO settings (key, value) VALUES (?, ?)
ON CONFLICT(key) DO UPDATE SET value = ?
```

**Buyer counter incremented**:
```sql
UPDATE buyers SET total_leads = total_leads + 1 WHERE id = ?
```

## Session Flow

### Timeline

```
T+0s    User lands on page
        → Frontend calls GET /api/assign-visitor
        → CRM Worker assigns buyer via round-robin
        → Stores session:uuid → buyer_id in KV (24hr TTL)
        → Returns { session_id, buyer_phone, buyer_name }

T+30s   User starts chatbot
        → Session ID stored in sessionStorage

T+2m    User completes form
        → Frontend calls POST / with session_id
        → Conversion Worker looks up session in KV
        → Finds buyer_id from session
        → Stores lead in D1 with buyer assignment
        → Sends conversion to Meta API

T+24h   Session expires from KV
        → If user returns, new assignment occurs
```

### Fallback Handling

**If session_id is missing or expired**:
```javascript
let buyerId = null;

// Try to get from session
if (session_id) {
  const session = await env.SESSIONS_KV.get(`session:${session_id}`, 'json');
  if (session) {
    buyerId = session.buyer_id;
  }
}

// Fallback: assign now
if (!buyerId) {
  const buyer = await assignBuyer(env);
  buyerId = buyer?.id;
}
```

**Why this works**:
- Ensures every lead gets assigned
- Gracefully handles session expiration
- No errors if user bypasses page load endpoint

## Deployment Architecture

### Cloudflare Workers

**Two separate workers**:

1. **tpn-conversion-api**
   - Route: `https://conversion.taxpeacenow.com/*`
   - Source: `cloudflare-worker.js`
   - Handles: Form submissions → D1 + Meta API

2. **tpn-crm-api**
   - Route: `https://crm.taxpeacenow.com/*`
   - Source: `workers/crm-api.js`
   - Handles: Session assignment, lead management, buyer config

**Shared bindings**:
- D1 Database: `tpn-leads`
- KV Namespace: `SESSIONS_KV`

**Separate secrets**:
- Conversion Worker: `META_ACCESS_TOKEN`, `META_PIXEL_ID`
- CRM Worker: `ADMIN_USER`, `ADMIN_PASS`

### Custom Domains

```bash
# Conversion worker (public, no auth)
wrangler deploy cloudflare-worker.js --name tpn-conversion-api
wrangler publish --routes conversion.taxpeacenow.com/*

# CRM worker (authenticated endpoints)
wrangler deploy workers/crm-api.js --name tpn-crm-api
wrangler publish --routes crm.taxpeacenow.com/*
```

### Environment Variables

**wrangler.toml (conversion-api)**:
```toml
name = "tpn-conversion-api"
main = "cloudflare-worker.js"

[[d1_databases]]
binding = "DB"
database_name = "tpn-leads"
database_id = "xxx"

[[kv_namespaces]]
binding = "SESSIONS_KV"
id = "xxx"

# Secrets: META_ACCESS_TOKEN, META_PIXEL_ID
```

**wrangler.toml (crm-api)**:
```toml
name = "tpn-crm-api"
main = "workers/crm-api.js"

[[d1_databases]]
binding = "DB"
database_name = "tpn-leads"
database_id = "xxx"

[[kv_namespaces]]
binding = "SESSIONS_KV"
id = "xxx"

# Secrets: ADMIN_USER, ADMIN_PASS
```

## Security

### Public Endpoints (No Auth)

- `POST /` (conversion worker) - Accepts form submissions
- `GET /api/assign-visitor` (crm worker) - Assigns buyers

**Protection**:
- CORS headers restrict origins
- Rate limiting via Cloudflare
- Event ID deduplication in D1 (unique constraint)
- Input validation on all fields

### Protected Endpoints (Basic Auth)

- `GET /api/leads` - List leads
- `PUT /api/leads/:id` - Update lead status
- `GET /api/buyers` - List buyers
- `PUT /api/buyers/:id` - Update buyer config
- `GET /api/export` - CSV export
- `GET /api/metrics` - Dashboard stats

**Auth**:
```javascript
Authorization: Basic base64(username:password)
```

**Stored in secrets**:
```bash
wrangler secret put ADMIN_USER
wrangler secret put ADMIN_PASS
```

### Data Privacy

**Meta Conversions API**:
- Email, phone, names hashed with SHA-256
- IP and user agent sent for matching
- No PII stored in Meta payload custom_data

**Database**:
- Full PII stored in D1 (required for lead delivery)
- Access restricted to authenticated endpoints
- No public query interface

## Monitoring & Metrics

### Real-Time Logs

```bash
# Watch conversion worker
wrangler tail tpn-conversion-api

# Watch CRM worker
wrangler tail tpn-crm-api
```

### Database Queries

**Recent leads**:
```sql
SELECT
  l.id, l.first_name, l.last_name, l.email, l.phone,
  b.name as buyer_name, l.created_at, l.status
FROM leads l
LEFT JOIN buyers b ON l.buyer_id = b.id
ORDER BY l.created_at DESC
LIMIT 10;
```

**Buyer distribution**:
```sql
SELECT
  b.name,
  b.weight,
  b.total_leads as counter,
  COUNT(l.id) as actual_leads,
  b.is_active
FROM buyers b
LEFT JOIN leads l ON b.id = l.buyer_id
GROUP BY b.id, b.name, b.weight, b.total_leads, b.is_active;
```

**Status breakdown**:
```sql
SELECT status, COUNT(*) as count
FROM leads
GROUP BY status
ORDER BY count DESC;
```

**Today's conversion rate** (if tracking page views):
```sql
SELECT
  COUNT(*) as submissions,
  (SELECT value FROM settings WHERE key = 'page_views_today') as views,
  ROUND(COUNT(*) * 100.0 / (SELECT value FROM settings WHERE key = 'page_views_today'), 2) as cvr
FROM leads
WHERE DATE(created_at) = DATE(CURRENT_TIMESTAMP);
```

### Dashboard Metrics (via API)

**GET /api/metrics**:
```json
{
  "total_leads": 1523,
  "today_leads": 47,
  "buyer_distribution": [
    { "id": 1, "name": "Company 1", "lead_count": 762 },
    { "id": 2, "name": "Company 2", "lead_count": 761 }
  ],
  "status_breakdown": [
    { "status": "new", "count": 350 },
    { "status": "contacted", "count": 820 },
    { "status": "qualified", "count": 230 },
    { "status": "converted", "count": 100 },
    { "status": "lost", "count": 23 }
  ]
}
```

## Error Handling

### Conversion Worker

**No active buyers**:
```javascript
if (!buyer) {
  // Still store lead with buyer_id = null
  // Allows manual assignment later
  console.warn('No active buyers - lead stored unassigned');
}
```

**D1 insert fails**:
```javascript
try {
  await env.DB.prepare(...).run();
} catch (error) {
  console.error('D1 insert failed:', error);
  // Meta API call still proceeds
  // Lead data captured in logs for manual recovery
}
```

**Meta API fails**:
```javascript
const metaResponse = await fetch(...);
if (!metaResponse.ok) {
  console.warn('Meta API error:', await metaResponse.text());
  // Lead still stored in D1
  // Return success to user
}
```

### CRM Worker

**Session assignment fails**:
```javascript
if (!buyer) {
  return new Response(JSON.stringify({
    error: 'No active buyers available'
  }), { status: 503 });
}
```

**Invalid auth**:
```javascript
return new Response(JSON.stringify({
  error: 'Unauthorized'
}), { status: 401 });
```

## Future Enhancements

### Planned Features

1. **Lead webhooks** - Real-time notifications to buyer systems
2. **Buyer capacity limits** - Pause when daily quota reached
3. **Geographic routing** - Assign by state/region
4. **Priority tiers** - VIP buyers get higher-value leads
5. **Duplicate detection** - Flag repeat submissions
6. **A/B test tracking** - Store variant info with leads
7. **Email notifications** - Auto-send to buyers on new lead
8. **Lead scoring** - ML-based qualification predictions

### Scaling Considerations

**Current capacity**:
- D1: 100k reads/day, 50k writes/day (free tier)
- KV: 100k reads/day, 1k writes/day (free tier)
- Worker: 100k requests/day (free tier)

**Estimated load** (1000 leads/day):
- D1 writes: 1000 (lead inserts) + 1000 (buyer updates) = 2000/day
- D1 reads: 1000 (buyer lookups) + 1000 (session checks) = 2000/day
- KV writes: 1000 (session assignments) = 1000/day
- KV reads: 1000 (session lookups) = 1000/day
- Worker requests: 2000 (1000 assigns + 1000 conversions) = 2000/day

**Well within free tier limits** - Scales to 10k+ leads/day before paid tier needed

## Testing

### Local Development

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Create local D1
wrangler d1 create tpn-leads-dev

# Run migrations
wrangler d1 execute tpn-leads-dev --file=./workers/schema.sql

# Start dev server
wrangler dev cloudflare-worker.js --local
```

### Test Endpoints

**Assign visitor**:
```bash
curl https://localhost:8787/api/assign-visitor
```

**Submit lead**:
```bash
curl -X POST https://localhost:8787 \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

**List leads** (needs auth):
```bash
curl https://localhost:8787/api/leads \
  -H "Authorization: Basic $(echo -n 'admin:pass' | base64)"
```

### Integration Tests

See `/Users/beef/Repository/tpn-funnel/workers/tests/` (to be created)

## Related Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Step-by-step deployment
- [workers/schema.sql](workers/schema.sql) - Database schema
- [workers/crm-api.js](workers/crm-api.js) - CRM API source
- [cloudflare-worker.js](cloudflare-worker.js) - Conversion worker source
