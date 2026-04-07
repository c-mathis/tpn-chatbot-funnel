# Buyer Dashboard Setup

## Two Separate Dashboards Created

Each buyer has their own dashboard that only shows **their assigned leads**. They cannot see each other's leads.

---

## Dashboard Files

**Apex Tax Team** (Buyer ID: 1)
- File: `leads-apex.html`
- Color: Blue theme
- Shows: Only leads assigned to Apex Tax Team

**Trusted Tax** (Buyer ID: 2)
- File: `leads-trusted.html`
- Color: Green theme
- Shows: Only leads assigned to Trusted Tax

---

## How to Deploy & Share

### Option 1: Deploy to Cloudflare Pages (Recommended)

Deploy each dashboard separately:

```bash
# Deploy Apex Tax Team dashboard
mkdir apex-leads
cp leads-apex.html apex-leads/index.html
cd apex-leads
npx wrangler pages deploy . --project-name=apex-leads
# Result: https://apex-leads.pages.dev

# Deploy Trusted Tax dashboard
cd ..
mkdir trusted-leads
cp leads-trusted.html trusted-leads/index.html
cd trusted-leads
npx wrangler pages deploy . --project-name=trusted-leads
# Result: https://trusted-leads.pages.dev
```

Then share the URLs:
- Send `https://apex-leads.pages.dev` to Apex Tax Team
- Send `https://trusted-leads.pages.dev` to Trusted Tax

---

### Option 2: Email HTML Files

Each file is standalone and works offline. Just email:
- `leads-apex.html` → Apex Tax Team
- `leads-trusted.html` → Trusted Tax

They open it in any browser and it works immediately.

---

### Option 3: Host on Your Server

Upload to your web server:
```bash
# Upload to different paths
/leads/apex.html → Apex Tax Team
/leads/trusted.html → Trusted Tax
```

---

## Features

**Auto-refresh**: Every 30 seconds
**Filters**: Status, date range
**Statistics**: Total leads, today's leads, new leads
**Clickable**: Email and phone links
**No login**: Instant access

---

## Update Contact Info

Update phone numbers for each buyer:

```bash
# Apex Tax Team
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET phone_number='(800) XXX-XXXX', email='contact@apextax.com' WHERE id=1"

# Trusted Tax
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET phone_number='(800) XXX-XXXX', email='contact@trustedtax.com' WHERE id=2"
```

---

## Current Status

✅ Database configured
- Buyer 1: Apex Tax Team (ID: 1)
- Buyer 2: Trusted Tax (ID: 2)
- Distribution: 50/50 (weight: 1 each)

✅ Dashboards created
- `leads-apex.html` - Blue theme, buyer_id=1
- `leads-trusted.html` - Green theme, buyer_id=2

✅ Security
- Each dashboard hard-coded to show only their buyer_id
- No cross-visibility
- Read-only access (no editing)

---

## Adjust Lead Distribution

Currently 50/50. To change:

```bash
# Give Apex 2x more leads (2:1 ratio - Apex gets 67%, Trusted gets 33%)
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET weight=2 WHERE id=1"

# Or give Trusted 2x more leads
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET weight=2 WHERE id=2"

# Reset to 50/50
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET weight=1 WHERE id IN (1,2)"
```

---

## Temporarily Pause a Buyer

```bash
# Pause Apex (all leads go to Trusted)
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET is_active=0 WHERE id=1"

# Resume Apex
wrangler d1 execute tpn_crm --remote --command="UPDATE buyers SET is_active=1 WHERE id=1"
```

---

## Test the Dashboards

1. Open each HTML file in your browser
2. You should see:
   - Header with buyer name
   - Stats showing 0 leads (until traffic starts)
   - Empty table ready for leads
3. Auto-refresh happens every 30 seconds

---

## When Traffic Starts

- Leads will auto-distribute 50/50 between buyers
- Each dashboard updates every 30 seconds
- Buyers only see their assigned leads
- All lead details shown in spreadsheet format

**Ready to deploy! Choose one of the 3 options above to share with buyers.**
