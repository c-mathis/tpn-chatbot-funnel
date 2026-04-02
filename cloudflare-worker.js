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

      // Get buyer from session ID (if exists)
      let buyerId = null;
      if (session_id) {
        const session = await env.SESSIONS_KV.get(`session:${session_id}`, 'json');
        if (session) {
          buyerId = session.buyer_id;
        }
      }

      // Fallback: If no valid session, assign now
      if (!buyerId) {
        const buyer = await assignBuyer(env);
        buyerId = buyer?.id;
      }

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
 * Round-robin buyer assignment with weighted distribution
 * (Duplicated from crm-api.js for self-contained deployment)
 */
async function assignBuyer(env) {
  // Get active buyers ordered by ID
  const { results: buyers } = await env.DB.prepare(
    'SELECT * FROM buyers WHERE is_active = 1 ORDER BY id ASC'
  ).all();

  if (!buyers || buyers.length === 0) {
    return null;
  }

  // Get current round-robin position
  const { results: settings } = await env.DB.prepare(
    'SELECT value FROM settings WHERE key = ?'
  ).bind('round_robin_position').all();

  let position = 0;
  if (settings && settings.length > 0) {
    position = parseInt(settings[0].value) || 0;
  }

  // Build weighted pool (repeat buyers by weight)
  const weightedPool = [];
  for (const buyer of buyers) {
    const weight = buyer.weight || 1;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(buyer);
    }
  }

  // Select buyer using position % pool.length
  const selectedBuyer = weightedPool[position % weightedPool.length];

  // Increment position for next assignment
  const nextPosition = (position + 1) % weightedPool.length;
  await env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
  ).bind('round_robin_position', nextPosition.toString(), nextPosition.toString()).run();

  // Update buyer total_leads counter
  await env.DB.prepare(
    'UPDATE buyers SET total_leads = total_leads + 1 WHERE id = ?'
  ).bind(selectedBuyer.id).run();

  return selectedBuyer;
}