// Cloudflare Worker for Meta Conversions API + D1 Lead Storage
// Deploy this to Cloudflare Workers and set environment variables
//
// Environment bindings required:
// - DB (D1 database)
// - SESSIONS_KV (KV namespace)
// - META_ACCESS_TOKEN (secret)
// - META_PIXEL_ID (secret)
// - GOOGLE_SHEETS_URL (optional)
// - GA4_MEASUREMENT_ID (e.g. "G-RFVN78XR1Q")
// - GA4_API_SECRET (secret from GA4 Admin → Data Streams → MP API secrets)

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const data = await request.json();
      
      // Extract lead data
      const {
        firstName,
        lastName,
        email,
        phone,
        state,
        debt_amount,
        tax_type,
        tax_problem,
        tax_jurisdiction,
        employment_status,
        collection_actions,
        unfiled_years,
        contactTime,
        source = 'Tax Peace Now Chatbot',
        session_id,
        fbclid,
        fbc,
        fbp,
        // Additional fields from different flow branches
        back_taxes_amount,
        back_taxes_actions,
        notice_amount,
        filing_status,
        business_structure
      } = data;

      // Get client IP and user agent
      const clientIp = request.headers.get('CF-Connecting-IP') ||
                      request.headers.get('X-Forwarded-For') ||
                      '127.0.0.1';
      const userAgent = request.headers.get('User-Agent') || '';

      // Use event ID from client for deduplication
      const eventId = data.event_id;

      // Smart lead routing based on form answers
      const buyer = await assignBuyerSmart(data, env);
      const buyerId = buyer?.id;

      // Store lead in D1 database
      await env.DB.prepare(`
        INSERT INTO leads (
          event_id, first_name, last_name, email, phone, state,
          tax_problem, tax_jurisdiction, tax_data,
          buyer_id, assigned_at, status, source, page_url,
          fbclid, fbc, fbp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'new', ?, ?, ?, ?, ?)
      `).bind(
        eventId || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName,
        lastName,
        email,
        phone,
        state || 'Not specified',
        tax_problem || 'Not specified',
        tax_jurisdiction || 'Not specified',
        JSON.stringify({
          debt_amount: debt_amount || back_taxes_amount || notice_amount || '',
          tax_type: tax_type || '',
          employment_status: employment_status || filing_status || business_structure || '',
          collection_actions: collection_actions || (Array.isArray(back_taxes_actions) ? back_taxes_actions.join(', ') : back_taxes_actions) || '',
          unfiled_years: unfiled_years || '',
          contactTime: contactTime || 'Any time'
        }),
        buyerId,
        source,
        data.page_url || 'https://taxpeacenow.com',
        fbclid || null,
        fbc || null,
        fbp || null
      ).run();

      // Send Apex Tax Team leads to their Base44 app
      if (buyerId === 1) { // Apex Tax Team
        try {
          const taxDataObj = JSON.parse(JSON.stringify({
            debt_amount: debt_amount || back_taxes_amount || notice_amount || '',
            tax_type: tax_type || '',
            employment_status: employment_status || filing_status || business_structure || '',
            collection_actions: collection_actions || (Array.isArray(back_taxes_actions) ? back_taxes_actions.join(', ') : back_taxes_actions) || '',
            unfiled_years: unfiled_years || '',
            contactTime: contactTime || 'Any time'
          }));

          await fetch('https://accu-flow-client-portal-d8bc4474.base44.app/api/functions/receiveTaxLeadFromTPN', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName,
              lastName,
              email,
              phone,
              state,
              tax_problem,
              tax_jurisdiction,
              debt_amount: taxDataObj.debt_amount,
              collection_actions: taxDataObj.collection_actions,
              unfiled_years: taxDataObj.unfiled_years,
              employment_status: taxDataObj.employment_status,
              source: source || 'Tax Peace Now Chatbot',
              event_id: eventId
            })
          });
          console.log('Lead sent to Apex Base44 app');
        } catch (apexError) {
          console.error('Failed to send lead to Apex app:', apexError);
        }
      }

      // Meta Conversions API disabled - browser pixel tracking is sufficient
      // Browser-side fbq('track', 'CompleteRegistration') handles conversion tracking

      // === GA4 Measurement Protocol (server-side) ===
      // Fires generate_lead server-side so we still capture the conversion when
      // ad blockers / iOS ITP block the browser gtag call. Uses the same
      // client_id the browser used, so it attributes to the same user session.
      // Skip test submissions.
      const isTest = data.page_url && data.page_url.includes('test=true');
      if (!isTest && env.GA4_MEASUREMENT_ID && env.GA4_API_SECRET && data.ga_client_id) {
        ctx.waitUntil(sendGa4Event(env, data, eventId));
      }

      // Optional: Send to Google Sheets (keep existing functionality)
      if (env.GOOGLE_SHEETS_URL) {
        try {
          await fetch(env.GOOGLE_SHEETS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              ...data,
              ts: new Date().toISOString(),
              event_id: eventId
            }),
          });
        } catch (e) {
          console.warn('Google Sheets submission failed:', e);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          event_id: eventId
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );

    } catch (error) {
      console.error('Error processing conversion:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};

/**
 * Smart lead routing based on tax situation and debt amount
 * Apex Tax Team (ID: 1) = CPA-style leads
 * Trusted Tax (ID: 2) = General tax resolution
 */
async function assignBuyerSmart(leadData, env) {
  // Get active buyers
  const { results: buyers } = await env.DB.prepare(
    'SELECT * FROM buyers WHERE is_active = 1 ORDER BY id ASC'
  ).all();

  if (!buyers || buyers.length === 0) {
    return null;
  }

  const apexBuyer = buyers.find(b => b.id === 1);
  const trustedBuyer = buyers.find(b => b.id === 2);

  if (!apexBuyer || !trustedBuyer) {
    // Fallback to first active buyer if either is missing
    return buyers[0];
  }

  // Parse tax_data for additional fields
  let taxData = {};
  try {
    taxData = typeof leadData.tax_data === 'string'
      ? JSON.parse(leadData.tax_data)
      : (leadData.tax_data || {});
  } catch (e) {
    taxData = {};
  }

  // CPA-Style Routing Rules (Always → Apex)
  // Rule 1: "I need help filing or organizing my taxes"
  if (leadData.tax_problem === "I need help filing or organizing my taxes") {
    await incrementBuyerLeads(env, apexBuyer.id);
    return apexBuyer;
  }

  // Rule 2: Unfiled returns with "Current year - 1 year" selected
  const unfiledYears = taxData.unfiled_years || leadData.unfiled_years;
  if (unfiledYears === "Current year - 1 year") {
    await incrementBuyerLeads(env, apexBuyer.id);
    return apexBuyer;
  }

  // Debt-Based Routing Rules
  const debtAmount = taxData.debt_amount || leadData.debt_amount || leadData.back_taxes_amount || '';

  // Under $10k → 25% Apex, 75% Trusted
  if (debtAmount.includes('$0 - $10,000')) {
    const random = Math.random();
    const selectedBuyer = random < 0.25 ? apexBuyer : trustedBuyer;
    await incrementBuyerLeads(env, selectedBuyer.id);
    return selectedBuyer;
  }

  // $10k-$50k → 100% Trusted
  // Matches: $10,001 - $20,000 through $40,001 - $50,000
  if (debtAmount.includes('$10,001') ||
      debtAmount.includes('$20,001') ||
      debtAmount.includes('$30,001') ||
      debtAmount.includes('$40,001')) {
    await incrementBuyerLeads(env, trustedBuyer.id);
    return trustedBuyer;
  }

  // $50k+ → 50% Apex, 50% Trusted
  // Matches: $50,000 - $75,000 and higher
  if (debtAmount.includes('$50,000') ||
      debtAmount.includes('$75,000') ||
      debtAmount.includes('$100,0') ||
      debtAmount.includes('$200,000') ||
      debtAmount.includes('$300,000') ||
      debtAmount.includes('$400,000')) {
    const random = Math.random();
    const selectedBuyer = random < 0.5 ? apexBuyer : trustedBuyer;
    await incrementBuyerLeads(env, selectedBuyer.id);
    return selectedBuyer;
  }

  // Default fallback: 50/50 split
  const random = Math.random();
  const selectedBuyer = random < 0.5 ? apexBuyer : trustedBuyer;
  await incrementBuyerLeads(env, selectedBuyer.id);
  return selectedBuyer;
}

/**
 * Increment buyer lead counter
 */
async function incrementBuyerLeads(env, buyerId) {
  await env.DB.prepare(
    'UPDATE buyers SET total_leads = total_leads + 1 WHERE id = ?'
  ).bind(buyerId).run();
}

/**
 * Send generate_lead event to GA4 via Measurement Protocol.
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 *
 * Uses the browser's client_id so events merge with the same user's session.
 * Fires async via ctx.waitUntil — failures are logged but do not block the response.
 */
async function sendGa4Event(env, data, eventId) {
  try {
    const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`;

    const debtAmount = data.debt_amount || data.back_taxes_amount || data.notice_amount || '';

    const payload = {
      client_id: data.ga_client_id,
      // non_personalized_ads false so Google Ads can use these events for audiences
      non_personalized_ads: false,
      events: [{
        name: 'generate_lead',
        params: {
          // Standard GA4 ecommerce params for a lead
          currency: 'USD',
          value: 1,
          lead_id: eventId,
          // Session stitching — if provided, GA4 will attach to this session
          session_id: data.ga_session_id || undefined,
          engagement_time_msec: 1,
          // Custom dimensions (must be registered in GA4 Admin → Custom definitions)
          tax_problem: data.tax_problem || '',
          tax_jurisdiction: data.tax_jurisdiction || '',
          state: data.state || '',
          debt_amount: debtAmount,
          // Attribution
          source: data.utm_source || '',
          medium: data.utm_medium || '',
          campaign: data.utm_campaign || '',
          content: data.utm_content || '',
          term: data.utm_term || '',
          page_location: data.page_url || '',
          page_referrer: data.referrer || '',
          // Tag this event so you can filter it in GA4 as server-side
          delivery_method: 'server'
        }
      }]
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn('GA4 MP returned non-OK:', res.status, await res.text());
    } else {
      console.log('GA4 MP generate_lead sent:', eventId);
    }
  } catch (err) {
    console.error('GA4 Measurement Protocol error:', err);
  }
}