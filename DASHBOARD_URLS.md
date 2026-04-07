# Buyer Dashboard URLs

## ✅ Live Dashboards

Both dashboards are deployed and live on Cloudflare Pages.

---

## Apex Tax Team Dashboard

**URL:** https://apex-leads.pages.dev

**Phone:** 866-466-7012

**Receives:**
- CPA-style leads (filing/organizing taxes)
- Unfiled returns with "Current year - 1 year"
- 25% of under $10k debt leads
- 50% of $50k+ debt leads

**Features:**
- Blue color theme
- Auto-refreshes every 30 seconds
- Shows only Apex-assigned leads
- No login required

---

## Trusted Tax Dashboard

**URL:** https://trusted-leads.pages.dev

**Phone:** 866-314-3628

**Receives:**
- 75% of under $10k debt leads
- 100% of $10k-$50k debt leads
- 50% of $50k+ debt leads

**Features:**
- Green color theme
- Auto-refreshes every 30 seconds
- Shows only Trusted-assigned leads
- No login required

---

## How to Use

1. **Share URLs** with each buyer
2. **Bookmark in browser** for easy access
3. **Leave tab open** - auto-refreshes every 30 seconds
4. **Click email/phone** in table to contact leads

---

## What's Displayed

Each dashboard shows:
- Lead ID & submission date/time
- Full name, email, phone (clickable)
- State, tax problem, tax jurisdiction
- Debt amount, tax type, employment status
- Collection actions, unfiled years, contact time preference
- Current status, source

---

## Stats at Top

Real-time counters:
- **Total:** All-time leads assigned to this buyer
- **Today:** Leads received today
- **New:** Leads with "new" status (not yet contacted)

---

## Filters

Both dashboards have:
- **Status filter:** All, New, Contacted, Qualified, Converted, Lost
- **Date filter:** Show leads from specific date forward
- **Refresh button:** Manual refresh if needed

---

## Mobile Friendly

Dashboards work on:
- Desktop browsers
- Tablets
- Mobile phones

All columns visible with horizontal scroll on mobile.

---

## Security

- **Read-only access:** Buyers can view but not edit
- **Filtered by buyer_id:** Each dashboard only shows their assigned leads
- **No authentication required:** Easy access for buyers
- **HTTPS encrypted:** All data transmitted securely

---

## Support

**If dashboard shows "No leads found":**
- Check filters (reset to "All" statuses)
- Verify date filter is not set too far in future
- Confirm traffic is flowing to the site

**If dashboard won't load:**
- Check internet connection
- Try different browser
- Clear browser cache
- Verify URL is correct

**To check if system is working:**
```bash
# View all recent leads in database
wrangler d1 execute tpn_crm --remote --command="SELECT COUNT(*) FROM leads"
```

---

## Share With Buyers

**Email Template:**

```
Hi [Buyer Name],

Your lead dashboard is ready! Access it here:
[Dashboard URL]

Features:
• Real-time lead notifications (auto-refreshes every 30 seconds)
• Click email/phone to contact leads instantly
• Filter by status or date
• Mobile-friendly

Bookmark this URL for easy access. No login required.

Questions? Let me know!
```

---

## Updates

Dashboard updates automatically when:
- New lead is assigned to buyer
- Lead status changes (if we add that feature later)
- Any lead data is modified

No need to refresh manually - it happens every 30 seconds.

---

## Next Steps

**Phase 2 Enhancements (Optional):**
- Add "Mark as Contacted" button
- Email notifications when new lead arrives
- Export to CSV
- Lead notes/comments
- Call tracking integration
- Offline conversion tracking

**Current version is fully functional for launch.**

---

## Production URLs

These are the permanent URLs. They won't change unless you delete the Cloudflare Pages projects.

- **Apex:** https://apex-leads.pages.dev
- **Trusted:** https://trusted-leads.pages.dev
- **Admin (Master):** https://admin-leads.pages.dev

**Ready to share with buyers!** 🎉
