# Tax Peace Now - Programmatic SEO Strategy

## Executive Summary

This strategy outlines scalable SEO page opportunities for Tax Peace Now using programmatic templates and data-driven content. The goal is to capture long-tail search traffic from people actively seeking tax relief solutions.

---

## Business Context

- **Product/Service**: Tax relief consulting and IRS representation
- **Target Audience**: Individuals and business owners with IRS tax debt, unfiled returns, or collection actions
- **Conversion Goal**: Free 2-minute assessment → Lead capture
- **Current Pages**: 8 service pages, 2 blog articles

---

## Recommended Playbooks (Priority Order)

### 1. LOCATIONS Playbook - "[Service] in [City/State]"
**Highest Priority - Highest Volume**

Local search intent is massive for tax services. People search for help near them.

#### Keyword Patterns:
```
tax relief services in [city]
tax attorney [city]
irs help [city]
offer in compromise help [city]
tax debt relief [city] [state]
irs payment plan help [city]
wage garnishment help [city]
```

#### Page Count Potential:
- Top 200 US cities = 200 pages × 8 services = **1,600 pages**
- Start with: Top 50 cities = **400 pages**

#### URL Structure:
```
/tax-relief/[city]-[state]/
/offer-in-compromise/[city]-[state]/
/wage-garnishment-help/[city]-[state]/
```

#### Template Elements:
- H1: "[Service] Help in [City], [State]"
- Local IRS office information (public data)
- State-specific tax facts
- City population/income stats (unique per page)
- Local testimonial/case study if available
- State tax laws that compound federal issues

---

### 2. GLOSSARY Playbook - "What is [tax term]"
**High Value - Educational Intent**

Tax terminology confuses people. Capture informational queries that lead to service awareness.

#### Keyword Patterns:
```
what is an offer in compromise
what is irs fresh start program
what is wage garnishment
what is tax lien vs tax levy
what is penalty abatement
what is currently not collectible status
what is irs form [number]
what does irs notice [code] mean
```

#### Page Count Potential:
- 50-100 core tax terms = **50-100 pages**
- IRS forms glossary = **30-50 pages**
- IRS notice codes = **20-30 pages**

#### URL Structure:
```
/learn/what-is-[term]/
/learn/irs-form-[number]-explained/
/learn/irs-notice-[code]-meaning/
```

#### Template Elements:
- Clear definition in plain English
- Who this affects
- What to do next
- Related services (internal links)
- FAQ schema markup

---

### 3. PERSONAS Playbook - "[Solution] for [Audience Type]"
**Medium Volume - High Intent**

Different audiences have different tax problems. Speak directly to their situation.

#### Keyword Patterns:
```
tax relief for small business owners
irs help for self-employed
tax debt solutions for retirees
offer in compromise for 1099 contractors
unfiled taxes help for freelancers
irs payment plan for gig workers
tax relief for uber drivers
```

#### Page Count Potential:
- 15-20 distinct personas × 8 services = **120-160 pages**

#### Personas to Target:
1. Small business owners
2. Self-employed / Freelancers
3. 1099 contractors
4. Gig workers (Uber, DoorDash, etc.)
5. Real estate agents
6. Retirees / Seniors
7. Restaurant owners
8. Construction contractors
9. Healthcare workers
10. Truck drivers / Owner-operators
11. Amazon/Etsy sellers
12. Crypto traders
13. Divorced individuals
14. Inherited tax debt
15. Veterans

#### URL Structure:
```
/tax-relief/for-[persona]/
/offer-in-compromise/for-[persona]/
```

---

### 4. TAX DEBT AMOUNT Playbook - "Owe [Amount] to IRS"
**High Intent - Transactional**

People search by their specific debt amount to understand options.

#### Keyword Patterns:
```
owe irs $10,000 what are my options
$50,000 tax debt help
irs debt over $100,000
can't pay $25,000 to irs
settle $20,000 tax debt
```

#### Page Count Potential:
- Debt brackets: $5k, $10k, $15k, $20k, $25k, $50k, $75k, $100k, $150k, $200k+ = **10-15 pages**

#### URL Structure:
```
/tax-debt-help/owe-[amount]/
```

#### Template Elements:
- Options available at this debt level
- OIC eligibility at this amount
- Installment agreement terms
- What IRS can/will do at this level
- Calculator or assessment CTA

---

### 5. IRS NOTICE CODES Playbook
**Informational - High Anxiety Searches**

People Google the exact notice code they received.

#### Keyword Patterns:
```
irs notice cp2000
irs letter 4883c
irs cp14 notice
irs cp504 what to do
irs notice ltr 1058
```

#### Page Count Potential:
- 50+ common IRS notice codes = **50+ pages**

#### URL Structure:
```
/irs-notices/[notice-code]/
```

#### Template Elements:
- What this notice means
- Why you received it
- Response deadline
- What happens if you ignore it
- How to respond
- When to get help
- CTA: "Not sure what to do? Take our free assessment"

---

### 6. STATE-SPECIFIC TAX ISSUES
**Location Variant - State Focus**

Some states have additional complexity (state tax debt on top of federal).

#### Keyword Patterns:
```
california tax relief
new york state tax debt help
texas irs help (no state income tax angle)
[state] franchise tax board help
```

#### Page Count Potential:
- 50 states × key services = **50-100 pages**

#### URL Structure:
```
/[state]-tax-relief/
/[state]-offer-in-compromise/
```

---

## Implementation Priority

### Phase 1: Foundation (First 30 days)
1. **IRS Notice Code Pages** (50 pages)
   - Low competition, high intent
   - Data is publicly available (IRS.gov)
   - Template is straightforward

2. **Tax Debt Amount Pages** (10 pages)
   - Quick to create
   - Highly actionable content
   - Strong CTA opportunity

### Phase 2: Scale (30-60 days)
3. **Glossary/Educational Pages** (50 pages)
   - Builds topical authority
   - Supports other pages via internal linking
   - FAQ schema for featured snippets

4. **Top Persona Pages** (40 pages)
   - Start with highest-volume personas
   - Self-employed, small business, gig workers

### Phase 3: Local Domination (60-90 days)
5. **Location Pages** - Top 50 Cities (400 pages)
   - Requires unique local data per page
   - Build out by state clusters
   - Start with high-population states: CA, TX, FL, NY

### Phase 4: Expansion (90+ days)
6. **Remaining Location Pages** (1,200+ pages)
7. **State-Specific Pages** (50 pages)
8. **Long-tail Persona Variations**

---

## Technical Requirements

### URL Structure (Subfolder Strategy)
```
taxpeacenow.com/
├── /irs-notices/[code]/
├── /tax-debt-help/owe-[amount]/
├── /learn/[term]/
├── /[service]/for-[persona]/
├── /[service]/[city]-[state]/
└── /[state]-tax-relief/
```

### Template Requirements
Each template needs:
- Unique H1 with primary keyword
- Unique meta title and description
- 300+ words of unique content per page
- Conditional content blocks based on data
- Internal links to related pages
- Breadcrumb navigation
- FAQ schema where applicable
- LocalBusiness schema for location pages

### Data Sources Needed
| Data Type | Source | Updates |
|-----------|--------|---------|
| IRS Notice Codes | IRS.gov (public) | Annual review |
| City/State Data | Census, BLS | Annual |
| Local IRS Offices | IRS.gov | Quarterly |
| State Tax Laws | State revenue depts | Annual |

---

## Quality Guidelines

### Avoid Thin Content
- Each page must answer a distinct search intent
- Location pages need LOCAL data (not just city name swapped)
- Include unique stats, case studies, or insights per page

### Internal Linking Architecture
```
Hub Pages (Services)
    ↓
Spoke Pages (Locations/Personas)
    ↓
Supporting Content (Glossary/Notices)
```

### Indexation Strategy
1. Create XML sitemaps per page type
2. Prioritize high-volume pages first
3. NoIndex very low-volume city variations initially
4. Monitor crawl budget in Search Console

---

## Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| Pages Indexed | 500+ |
| Organic Traffic | 10,000 sessions/mo |
| Leads from pSEO | 100/month |
| Top 10 Rankings | 200+ keywords |
| Avg. Position | < 20 for target terms |

---

## Next Steps

1. [ ] Validate keyword volumes for each playbook
2. [ ] Build IRS Notice Code data file
3. [ ] Create HTML template for notice pages
4. [ ] Set up city/state data file
5. [ ] Build generation script for static pages
6. [ ] Implement schema markup templates
7. [ ] Create internal linking logic
8. [ ] Set up sitemap generation

---

*Strategy created: 2026-02-26*
*Based on programmatic-seo skill from marketingskills*
