# Meta Conversions API Deployment Guide

## Overview
This setup switches from page-based Meta Pixel tracking to server-side Conversions API using Cloudflare Workers for better iOS 14+ tracking and reliability.

## Step 1: Get Meta Access Token

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to Events Manager
3. Select your pixel (ID: `359485176693329`)
4. Go to Settings > Conversions API
5. Generate an Access Token (save this securely)

## Step 2: Deploy Cloudflare Worker

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Set environment variables:
   ```bash
   wrangler secret put META_ACCESS_TOKEN
   # Enter your Meta access token when prompted
   
   wrangler secret put META_PIXEL_ID
   # Enter: 359485176693329
   
   # Optional: Keep Google Sheets integration
   wrangler secret put GOOGLE_SHEETS_URL
   # Enter your existing Google Apps Script URL
   ```

4. Deploy the worker:
   ```bash
   wrangler deploy
   ```

5. Note your worker URL (e.g., `https://tax-peace-conversions.YOUR-SUBDOMAIN.workers.dev/`)

## Step 3: Update Frontend Code

Update line 488 in `assets/wizard.js` with your actual worker URL:
```javascript
await fetch('https://tax-peace-conversions.YOUR-SUBDOMAIN.workers.dev/', {
```

## Step 4: Test Setup

1. Submit a test lead through your form
2. Check Cloudflare Worker logs:
   ```bash
   wrangler tail
   ```
3. Verify events in Meta Events Manager (may take 15-30 minutes to appear)

## Benefits of This Setup

✅ **iOS 14+ Tracking**: Server-side tracking bypasses browser restrictions  
✅ **Deduplication**: Uses event_id to prevent double-counting  
✅ **Reliability**: Cloudflare's global network ensures high uptime  
✅ **Privacy**: Hashes PII before sending to Meta  
✅ **Fallback**: Still has Google Sheets backup if worker fails  

## What Changed

- **Removed**: Client-side Meta Pixel `CompleteRegistration` step tracking
- **Kept**: Client-side Meta Pixel `Lead` event (with event_id for deduplication) 
- **Added**: Server-side Conversions API via Cloudflare Worker
- **Enhanced**: Better error handling and fallbacks

## Monitoring

- Monitor worker performance in Cloudflare dashboard
- Check Meta Events Manager for conversion data
- Use browser dev tools to verify event_id matching