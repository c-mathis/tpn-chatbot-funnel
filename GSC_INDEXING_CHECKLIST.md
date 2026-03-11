# Google Search Console Indexing Checklist

Post-deployment actions to get pages indexed.

---

## After Every Deploy

### 1. Resubmit Sitemap
- Go to **Sitemaps** in GSC
- Enter: `sitemap.xml`
- Click **Submit**

### 2. Ping Google
```bash
curl "https://www.google.com/ping?sitemap=https://taxpeacenow.com/sitemap.xml"
```

---

## Priority Pages for Manual Indexing

Use **URL Inspection** → paste URL → **Request Indexing**

### Tier 1: Service Pages (do first)
```
https://taxpeacenow.com/services/offer-in-compromise.html
https://taxpeacenow.com/services/installment-agreement.html
https://taxpeacenow.com/services/currently-not-collectible.html
https://taxpeacenow.com/services/tax-relief.html
https://taxpeacenow.com/services/fresh-start-program.html
https://taxpeacenow.com/services/penalty-abatement.html
https://taxpeacenow.com/services/wage-garnishment.html
https://taxpeacenow.com/services/unfiled-tax-returns.html
```

### Tier 2: Hub Pages
```
https://taxpeacenow.com/learn/
https://taxpeacenow.com/blog/
```

### Tier 3: High-Value Learn Pages
```
https://taxpeacenow.com/learn/what-is-offer-in-compromise.html
https://taxpeacenow.com/learn/what-is-installment-agreement.html
https://taxpeacenow.com/learn/what-is-tax-debt.html
https://taxpeacenow.com/learn/what-is-wage-garnishment.html
https://taxpeacenow.com/learn/what-is-tax-lien.html
https://taxpeacenow.com/learn/what-is-fresh-start-program.html
```

### Tier 4: Comparison Pages
```
https://taxpeacenow.com/compare/offer-in-compromise-vs-installment-agreement.html
https://taxpeacenow.com/compare/offer-in-compromise-vs-currently-not-collectible.html
https://taxpeacenow.com/compare/installment-agreement-vs-currently-not-collectible.html
```

---

## Validating Fixes

If pages show "Discovered - currently not indexed":

1. Go to **Pages** in GSC
2. Filter by issue type
3. Click on affected URL
4. Click **Validate Fix**

This tells Google to re-crawl and re-evaluate.

---

## Expected Timeline

| Milestone | Timeframe |
|-----------|-----------|
| Sitemap acknowledged | 24-48 hours |
| Priority pages indexed | 1-2 weeks |
| Bulk pages indexed | 2-4 weeks |
| Full indexation | 4-8 weeks |

---

## Monitoring

Check weekly:
- **Pages** → "Not indexed" count should decrease
- **Performance** → Impressions for new pages
- **Sitemaps** → "Discovered" vs "Indexed" ratio

---

## Common Issues

### "Discovered - currently not indexed"
- Usually means low priority or thin content
- Fix: Add more unique content, improve internal linking

### "Crawled - currently not indexed"
- Google crawled but chose not to index
- Fix: Improve content quality, check for duplicate content

### "Duplicate without user-selected canonical"
- Google found duplicate content
- Fix: Ensure canonical tags are correct and consistent

---

## Technical Requirements

All pages must have:
- [x] Unique `<title>` tag
- [x] Unique `<meta name="description">`
- [x] `<link rel="canonical">` matching actual URL (use `.html`, not trailing slash)
- [x] `<meta property="og:url">` matching canonical
- [x] Schema markup (Article, FAQPage, BreadcrumbList as appropriate)
- [x] Proper internal linking
- [x] Listed in sitemap.xml

---

*Last updated: 2026-03-09*
