// Cloudflare Worker for Meta Conversions API
// Deploy this to Cloudflare Workers and set environment variables

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
        debt_amount,
        tax_type,
        employment_status,
        collection_actions,
        unfiled_years,
        contactTime,
        source = 'Tax Peace Now Chatbot'
      } = data;

      // Get client IP and user agent
      const clientIp = request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For') || 
                      '127.0.0.1';
      const userAgent = request.headers.get('User-Agent') || '';
      
      // Generate event ID for deduplication (same as client-side)
      const eventId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Hash email and phone for privacy
      const hashedEmail = await hashData(email?.toLowerCase());
      const hashedPhone = await hashData(phone?.replace(/\D/g, ''));
      
      // Prepare Meta Conversions API payload
      const conversionPayload = {
        data: [
          {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            event_source_url: data.page_url || 'https://taxpeacenow.com',
            action_source: 'website',
            user_data: {
              em: [hashedEmail],
              ph: [hashedPhone],
              fn: [await hashData(firstName?.toLowerCase())],
              ln: [await hashData(lastName?.toLowerCase())],
              client_ip_address: clientIp,
              client_user_agent: userAgent,
            },
            custom_data: {
              content_name: 'Tax Resolution Assessment',
              content_category: 'tax_resolution', 
              value: extractValueFromDebtAmount(debt_amount),
              currency: 'USD',
              debt_amount: debt_amount,
              tax_type: tax_type,
              employment_status: employment_status,
              collection_actions: collection_actions,
              unfiled_years: unfiled_years,
              source: source
            }
          }
        ]
      };

      // Send to Meta Conversions API
      const metaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${env.META_PIXEL_ID}/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...conversionPayload,
            access_token: env.META_ACCESS_TOKEN,
          }),
        }
      );

      const metaResult = await metaResponse.json();
      
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
          event_id: eventId,
          meta_response: metaResult 
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

// Helper function to hash data using SHA-256
async function hashData(data) {
  if (!data) return '';
  
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Extract numeric value from debt amount for Meta tracking
function extractValueFromDebtAmount(debtAmount) {
  if (!debtAmount) return 0;
  
  const valueMap = {
    '$0 - $10,000': 5000,
    '$10,001 - $20,000': 15000,
    '$20,001 - $30,000': 25000,
    '$30,001 - $40,000': 35000,
    '$40,001 - $50,000': 45000,
    '$50,000 - $75,000': 62500,
    '$75,000 - $100,000': 87500,
    '$100,001 - $199,999': 150000,
    '$200,000 - $300,000': 250000,
    '$300,000 - $400,000': 350000,
    '$400,000 - $500,000': 450000,
    '$500,000 and over': 500000
  };
  
  return valueMap[debtAmount] || 0;
}