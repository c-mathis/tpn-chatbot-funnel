# Google Search Console MCP Setup Guide

**Status:** 🔴 Not yet configured
**Priority:** Medium
**Estimated time:** 5-10 minutes

---

## Why This Matters

Direct access to Google Search Console data through Claude will allow:
- Real-time SEO performance analysis
- Automated keyword research and optimization
- Indexing status monitoring for new pages
- CTR and ranking trend analysis
- Sitemap validation

---

## Prerequisites

✅ `uvx` installed at `/Users/beef/.local/bin/uvx`
✅ `mcp-gsc` repo reviewed: https://github.com/AminForou/mcp-gsc
✅ Playwright setup scripts created in this directory

---

## Setup Steps

### Option 1: Manual Setup (Recommended - 5 min)

**Step 1: Enable Google Search Console API**

1. Go to: https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
2. Select your project (or create new: "GSC MCP Server")
3. Click **"ENABLE"**

**Step 2: Create OAuth Credentials**

1. Go to: https://console.cloud.google.com/apis/credentials/oauthclient
2. If prompted for OAuth consent screen:
   - Select **"External"**
   - App name: `GSC MCP Server`
   - Your email for support and developer contact
   - Click through the rest (can skip scopes and test users)
3. On the Create OAuth Client ID page:
   - **Application type**: `Desktop app`
   - **Name**: `GSC MCP - Claude`
   - Click **"CREATE"**
4. Click **"DOWNLOAD JSON"** button
5. Save the file

**Step 3: Move Credentials File**

```bash
mkdir -p ~/.config/gsc-mcp
mv ~/Downloads/client_secret_*.json ~/.config/gsc-mcp/client_secret.json
```

**Step 4: Add MCP Server to Claude**

```bash
claude mcp add gsc \
  --transport stdio \
  --scope user \
  -- uvx mcp-gsc
```

**Step 5: Configure Environment Variable**

Add to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
export GSC_OAUTH_CLIENT_SECRETS_FILE="$HOME/.config/gsc-mcp/client_secret.json"
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

**Step 6: Restart Claude Desktop**

Close and reopen Claude Desktop to load the new MCP server.

**Step 7: Verify Setup**

In Claude, run:
```
/mcp
```

Should show `gsc` in the list of connected servers.

---

### Option 2: Semi-Automated (Uses Playwright)

Run the helper script that opens the right pages:

```bash
cd /Users/beef/Repository/tpn-funnel
node setup-gsc-simple.js
```

Follow the on-screen instructions.

---

## Files Created for Setup

- `setup-gsc-oauth.js` - Fully automated script (requires interactive input)
- `setup-gsc-simple.js` - Opens browser to right pages with instructions
- `SETUP_GSC_MCP.md` - This file

---

## After Setup - What You Can Do

Once configured, you can ask Claude things like:

- "Show me top 10 keywords for TPN in the last 28 days"
- "What pages have indexing issues?"
- "Compare CTR for service pages vs blog articles"
- "Check if the new thank-you-duplicate page is indexed"
- "Show me all pages with impressions but low CTR"
- "Submit the updated sitemap"

---

## Troubleshooting

**"Authentication failed"**
- Make sure `GSC_OAUTH_CLIENT_SECRETS_FILE` environment variable is set
- Check that `client_secret.json` exists at the specified path
- Restart Claude Desktop after setting environment variables

**"No properties found"**
- You need to have Search Console access to `taxpeacenow.com`
- Verify you're logged into the correct Google account
- Check property verification in GSC

**"Permission denied"**
- OAuth consent screen must allow your email as a test user (if still in testing mode)
- Or publish the app to production in OAuth consent settings

---

## Related Documentation

- MCP Setup Guide: `/Users/beef/Repository/references/mcp/setup-guide.md`
- TPN Project Context: `/Users/beef/Repository/tpn-funnel/CLAUDE.md`
- mcp-gsc GitHub: https://github.com/AminForou/mcp-gsc
