// Cloudflare Worker for Meta Conversions API + D1 Lead Storage
// Deploy this to Cloudflare Workers and set environment variables
//
// Environment bindings required:
// - DB (D1 database)
// - SESSIONS_KV (KV namespace)
// - META_ACCESS_TOKEN (secret)
// - META_PIXEL_ID (secret)
// - GOOGLE_SHEETS_URL (optional)

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
        fbp
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
          debt_amount,
          tax_type,
          employment_status,
          collection_actions,
          unfiled_years,
          contactTime
        }),
        buyerId,
        source,
        data.page_url || 'https://taxpeacenow.com',
        fbclid || null,
        fbc || null,
        fbp || null
      ).run();

      // Meta Conversions API disabled - browser pixel tracking is sufficient
      // Browser-side fbq('track', 'CompleteRegistration') handles conversion tracking
      
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
  const debtAmount = taxData.debt_amount || leadData.debt_amount || '';

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