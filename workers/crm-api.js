/**
 * TPN CRM API Worker
 * Handles lead assignment, tracking, and CRM management
 *
 * Environment bindings required:
 * - DB (D1 database)
 * - SESSIONS_KV (KV namespace)
 * - ADMIN_USER (secret)
 * - ADMIN_PASS (secret)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route: GET /api/assign-visitor (NO AUTH REQUIRED)
      if (path === '/api/assign-visitor' && method === 'GET') {
        return handleAssignVisitor(env, corsHeaders);
      }

      // Route: GET /api/leads (NO AUTH REQUIRED - read-only for sales team)
      if (path === '/api/leads' && method === 'GET') {
        return handleGetLeads(url, env, corsHeaders);
      }

      // Route: GET /api/buyers (NO AUTH REQUIRED - read-only for sales team)
      if (path === '/api/buyers' && method === 'GET') {
        return handleGetBuyers(env, corsHeaders);
      }

      // Route: GET /api/metrics (NO AUTH REQUIRED - read-only for sales team)
      if (path === '/api/metrics' && method === 'GET') {
        return handleGetMetrics(env, corsHeaders);
      }

      // All other endpoints require authentication
      const authError = authenticateRequest(request, env);
      if (authError) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Route: PUT /api/leads/:id
      if (path.startsWith('/api/leads/') && method === 'PUT') {
        const leadId = path.split('/')[3];
        return handleUpdateLead(leadId, request, env, corsHeaders);
      }

      // Route: PUT /api/buyers/:id
      if (path.startsWith('/api/buyers/') && method === 'PUT') {
        const buyerId = path.split('/')[3];
        return handleUpdateBuyer(buyerId, request, env, corsHeaders);
      }

      // Route: GET /api/export
      if (path === '/api/export' && method === 'GET') {
        return handleExportLeads(url, env, corsHeaders);
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
};

/**
 * Authenticate request using HTTP Basic Auth
 */
function authenticateRequest(request, env) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return { error: 'Missing authorization header' };
  }

  const base64Credentials = authHeader.slice(6);
  const credentials = atob(base64Credentials);
  const [username, password] = credentials.split(':');

  if (username !== env.ADMIN_USER || password !== env.ADMIN_PASS) {
    return { error: 'Invalid credentials' };
  }

  return null; // Authentication successful
}

/**
 * GET /api/assign-visitor
 * Pre-assign buyer on page load using round-robin
 */
async function handleAssignVisitor(env, corsHeaders) {
  // Generate unique session ID
  const sessionId = crypto.randomUUID();

  // Execute round-robin assignment
  const buyer = await assignBuyer(env);

  if (!buyer) {
    return new Response(JSON.stringify({ error: 'No active buyers available' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Store session → buyer mapping in KV with 24-hour expiry
  await env.SESSIONS_KV.put(
    `session:${sessionId}`,
    JSON.stringify({
      buyer_id: buyer.id,
      buyer_phone: buyer.phone_number,
      buyer_name: buyer.name,
      assigned_at: new Date().toISOString(),
    }),
    { expirationTtl: 86400 } // 24 hours
  );

  return new Response(JSON.stringify({
    session_id: sessionId,
    buyer_phone: buyer.phone_number,
    buyer_name: buyer.name,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Round-robin buyer assignment with weighted distribution
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

/**
 * GET /api/leads
 * List leads with filters
 */
async function handleGetLeads(url, env, corsHeaders) {
  const params = url.searchParams;
  const buyerId = params.get('buyer_id');
  const status = params.get('status');
  const startDate = params.get('start_date');
  const limit = parseInt(params.get('limit')) || 50;
  const offset = parseInt(params.get('offset')) || 0;

  let query = 'SELECT l.*, b.name as buyer_name FROM leads l LEFT JOIN buyers b ON l.buyer_id = b.id WHERE 1=1';
  const bindings = [];

  if (buyerId) {
    query += ' AND l.buyer_id = ?';
    bindings.push(parseInt(buyerId));
  }

  if (status) {
    query += ' AND l.status = ?';
    bindings.push(status);
  }

  if (startDate) {
    query += ' AND DATE(l.created_at) >= ?';
    bindings.push(startDate);
  }

  query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const { results: leads } = await env.DB.prepare(query).bind(...bindings).all();

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as total FROM leads WHERE 1=1';
  const countBindings = [];

  if (buyerId) {
    countQuery += ' AND buyer_id = ?';
    countBindings.push(parseInt(buyerId));
  }

  if (status) {
    countQuery += ' AND status = ?';
    countBindings.push(status);
  }

  if (startDate) {
    countQuery += ' AND DATE(created_at) >= ?';
    countBindings.push(startDate);
  }

  const { results: countResult } = await env.DB.prepare(countQuery).bind(...countBindings).all();
  const total = countResult[0]?.total || 0;

  return new Response(JSON.stringify({
    leads,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    },
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * PUT /api/leads/:id
 * Update lead status
 */
async function handleUpdateLead(leadId, request, env, corsHeaders) {
  const body = await request.json();
  const { status } = body;

  if (!status) {
    return new Response(JSON.stringify({ error: 'Status is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  await env.DB.prepare(
    'UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(status, parseInt(leadId)).run();

  return new Response(JSON.stringify({ success: true, id: leadId, status }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/buyers
 * List all buyers
 */
async function handleGetBuyers(env, corsHeaders) {
  const { results: buyers } = await env.DB.prepare(
    'SELECT * FROM buyers ORDER BY id ASC'
  ).all();

  return new Response(JSON.stringify({ buyers }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * PUT /api/buyers/:id
 * Update buyer (is_active, weight)
 */
async function handleUpdateBuyer(buyerId, request, env, corsHeaders) {
  const body = await request.json();
  const updates = [];
  const bindings = [];

  if (typeof body.is_active !== 'undefined') {
    updates.push('is_active = ?');
    bindings.push(body.is_active ? 1 : 0);
  }

  if (typeof body.weight !== 'undefined') {
    updates.push('weight = ?');
    bindings.push(parseInt(body.weight));
  }

  if (updates.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  bindings.push(parseInt(buyerId));

  const query = `UPDATE buyers SET ${updates.join(', ')} WHERE id = ?`;
  await env.DB.prepare(query).bind(...bindings).run();

  return new Response(JSON.stringify({ success: true, id: buyerId }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/export
 * CSV export with date range
 */
async function handleExportLeads(url, env, corsHeaders) {
  const params = url.searchParams;
  const startDate = params.get('start_date');
  const endDate = params.get('end_date');

  let query = 'SELECT l.*, b.name as buyer_name FROM leads l LEFT JOIN buyers b ON l.buyer_id = b.id WHERE 1=1';
  const bindings = [];

  if (startDate) {
    query += ' AND DATE(l.created_at) >= ?';
    bindings.push(startDate);
  }

  if (endDate) {
    query += ' AND DATE(l.created_at) <= ?';
    bindings.push(endDate);
  }

  query += ' ORDER BY l.created_at DESC';

  const { results: leads } = await env.DB.prepare(query).bind(...bindings).all();

  // Build CSV
  const headers = [
    'ID', 'Name', 'Email', 'Phone', 'Tax Debt', 'Self Employed',
    'State', 'IRS Collections', 'Status', 'Buyer Name', 'Created At'
  ];

  const rows = leads.map(lead => [
    lead.id,
    lead.name || '',
    lead.email || '',
    lead.phone || '',
    lead.tax_debt || '',
    lead.self_employed || '',
    lead.state || '',
    lead.irs_collections || '',
    lead.status || '',
    lead.buyer_name || '',
    lead.created_at || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tpn_leads_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

/**
 * GET /api/metrics
 * Dashboard stats
 */
async function handleGetMetrics(env, corsHeaders) {
  // Total leads
  const { results: totalResult } = await env.DB.prepare(
    'SELECT COUNT(*) as total FROM leads'
  ).all();
  const totalLeads = totalResult[0]?.total || 0;

  // Today's count
  const { results: todayResult } = await env.DB.prepare(
    'SELECT COUNT(*) as today FROM leads WHERE DATE(created_at) = DATE(CURRENT_TIMESTAMP)'
  ).all();
  const todayLeads = todayResult[0]?.today || 0;

  // Buyer distribution
  const { results: distribution } = await env.DB.prepare(
    'SELECT b.id, b.name, COUNT(l.id) as lead_count FROM buyers b LEFT JOIN leads l ON b.id = l.buyer_id GROUP BY b.id, b.name ORDER BY b.id ASC'
  ).all();

  // Status breakdown
  const { results: statusBreakdown } = await env.DB.prepare(
    'SELECT status, COUNT(*) as count FROM leads GROUP BY status'
  ).all();

  return new Response(JSON.stringify({
    total_leads: totalLeads,
    today_leads: todayLeads,
    buyer_distribution: distribution,
    status_breakdown: statusBreakdown,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
