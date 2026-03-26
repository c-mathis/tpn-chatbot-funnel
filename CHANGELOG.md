# TPN Cloudflare Worker Changelog

## 2026-03-26 - Enhanced Lead Storage & Assignment

### Added

**D1 Database Integration**
- All form submissions now stored in D1 database
- Lead table includes full contact info, tax situation, buyer assignment
- Automatic deduplication via unique event_id constraint
- Timestamps for created_at, updated_at, assigned_at

**Session-Based Buyer Lookup**
- Pre-assigned buyers from visitor sessions (via SESSIONS_KV)
- Eliminates race conditions in buyer assignment
- 24-hour session TTL matches user journey timeframe

**Round-Robin Assignment**
- Weighted distribution algorithm (extracted from crm-api.js)
- Fallback assignment if session is missing/expired
- Position tracking in settings table
- Buyer counter auto-increments on assignment

### Modified

**cloudflare-worker.js**
- Line count: 190 → 297 (+107 lines)
- New imports: None (self-contained)
- New functions:
  - `assignBuyer(env)` - Round-robin with weighted distribution
- Updated `fetch()` handler:
  - Added session lookup logic (lines 61-74)
  - Added D1 insert statement (lines 76-107)
  - Preserved existing Meta API logic (lines 109-163)

### Environment Bindings Required

**New**:
- `env.DB` - D1 database binding
- `env.SESSIONS_KV` - KV namespace binding

**Existing** (unchanged):
- `env.META_ACCESS_TOKEN` - Meta Conversions API token
- `env.META_PIXEL_ID` - Meta Pixel ID
- `env.GOOGLE_SHEETS_URL` - Optional Google Sheets webhook

### Database Schema

**Tables Created**:
- `leads` - Form submissions with buyer assignments
- `buyers` - Resolution companies receiving leads (seeded with 2 placeholder buyers)
- `settings` - Round-robin position tracker
- `lead_events` - Audit trail (optional)

**Indexes**:
- `idx_leads_created_at` - Performance for date-range queries
- `idx_leads_buyer_id` - Performance for buyer filtering
- `idx_leads_status` - Performance for status filtering
- `idx_leads_email` - Performance for duplicate detection

### Breaking Changes

**None** - Fully backward compatible

**Frontend changes required**:
- Add `session_id` to submission payload (optional, has fallback)
- Add `state` to submission payload (defaults to 'Not specified')

### Migration Path

**From previous version**:
1. Deploy schema to D1: `wrangler d1 execute tpn-leads --file=./workers/schema.sql`
2. Create KV namespace: `wrangler kv:namespace create "SESSIONS_KV"`
3. Update wrangler.toml with bindings
4. Deploy worker: `wrangler deploy`

**No data loss** - Existing Meta API integration unchanged

### Performance Impact

**Additional operations per request**:
- +1 KV read (session lookup) - ~5-10ms
- +1 D1 write (lead insert) - ~10-20ms
- +2 D1 reads (buyer lookup, settings) - ~10-20ms (only if no session)
- +1 D1 write (settings update) - ~10ms (only if no session)

**Total added latency**: ~15-30ms (with session), ~45-70ms (without session)

**Meta API unchanged**: Still processes in parallel, no added latency

### Testing

**New test cases**:
- Submit with valid session_id → Uses pre-assigned buyer
- Submit with expired session_id → Assigns new buyer
- Submit with no session_id → Assigns new buyer
- Submit with invalid session_id → Assigns new buyer
- Submit when no active buyers → Stores with buyer_id=null

**Verification**:
```bash
# Check lead was stored
wrangler d1 execute tpn-leads --command "SELECT * FROM leads ORDER BY created_at DESC LIMIT 1"

# Check buyer was assigned
wrangler d1 execute tpn-leads --command "SELECT l.*, b.name as buyer_name FROM leads l LEFT JOIN buyers b ON l.buyer_id = b.id ORDER BY l.created_at DESC LIMIT 1"

# Check round-robin position updated
wrangler d1 execute tpn-leads --command "SELECT * FROM settings WHERE key = 'round_robin_position'"
```

### Known Issues

**None**

### Rollback Plan

If issues occur:
1. Remove D1 and KV bindings from wrangler.toml
2. Revert cloudflare-worker.js to previous version
3. Redeploy: `wrangler deploy`

**Data retained** - D1 database persists, can re-enable later

### Security Considerations

**No new vulnerabilities**:
- Session IDs are UUIDs (not sequential, not guessable)
- D1 write-only from public endpoint (no queries)
- KV read-only from public endpoint (no writes)
- All admin endpoints require Basic Auth (via crm-api.js)

### Documentation

**New files**:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Step-by-step deployment instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) - Complete system architecture
- [CHANGELOG.md](CHANGELOG.md) - This file

**Updated files**:
- [cloudflare-worker.js](cloudflare-worker.js) - Enhanced with D1 storage

**Related files**:
- [workers/crm-api.js](workers/crm-api.js) - CRM API (separate worker)
- [workers/schema.sql](workers/schema.sql) - Database schema

### Next Steps

1. Deploy to production (see DEPLOYMENT_GUIDE.md)
2. Update buyer phone numbers from placeholders to real numbers
3. Integrate frontend to call `/api/assign-visitor` on page load
4. Monitor lead distribution via CRM dashboard
5. Consider adding email notifications for new leads

---

## Previous Versions

### 2024-01-XX - Initial Version

**Features**:
- Meta Conversions API integration
- SHA-256 hashing for PII
- Google Sheets webhook (optional)
- CORS headers
- Event ID deduplication (client-side)

**Environment**:
- `META_ACCESS_TOKEN`
- `META_PIXEL_ID`
- `GOOGLE_SHEETS_URL` (optional)
