// Cloudflare Worker for Meta Conversions API + D1 Lead Storage + Email (Resend)
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
// - RESEND_API_KEY (secret from resend.com dashboard)
// - NOTIFY_EMAILS (comma-separated internal notification recipients, e.g. "cam@example.com,partner@firm.com")

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

      // === EMAIL NOTIFICATIONS (Resend) ===
      // Sends confirmation to user + internal notification to team.
      // Runs via ctx.waitUntil so it doesn't block the response to the browser.
      const isTestSubmission = data.page_url && data.page_url.includes('test=true');
      if (!isTestSubmission && env.RESEND_API_KEY && email) {
        // Look up buyer info for emails
        const buyerName = buyer?.name || 'Unassigned';
        const buyerPhone = buyer?.phone_number || null;

        // Confirmation email to the user
        ctx.waitUntil(sendConfirmationEmail(env, data, eventId, buyerPhone));

        // Internal notification to team
        ctx.waitUntil(sendInternalNotification(env, data, buyerName, eventId));
      }

      // Meta Conversions API disabled - browser pixel tracking is sufficient
      // Browser-side fbq('track', 'CompleteRegistration') handles conversion tracking

      // === GA4 Measurement Protocol (server-side) ===
      // Fires generate_lead server-side so we still capture the conversion when
      // ad blockers / iOS ITP block the browser gtag call. Uses the same
      // client_id the browser used, so it attributes to the same user session.
      // Skip test submissions.
      if (!isTestSubmission && env.GA4_MEASUREMENT_ID && env.GA4_API_SECRET && data.ga_client_id) {
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

// ============================================================
// EMAIL VIA RESEND
// ============================================================

/**
 * Send an email via Resend API.
 * Returns { id, success } on success, { success: false, error } on failure.
 */
async function sendEmail(env, { from, to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return { success: false, error: 'missing_api_key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to: replyTo,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', res.status, JSON.stringify(body));
      return { success: false, error: body };
    }

    return { success: true, id: body.id };
  } catch (err) {
    console.error('Resend send failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Log an email send to D1 for audit trail.
 */
async function logEmailSend(env, { leadEventId, emailType, toAddress, subject, resendId, status }) {
  try {
    await env.DB.prepare(`
      INSERT INTO emails_sent (lead_event_id, email_type, to_address, subject, resend_id, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      leadEventId || '',
      emailType,
      toAddress,
      subject,
      resendId || '',
      status
    ).run();
  } catch (err) {
    console.error('Failed to log email send:', err);
  }
}

/**
 * Send lead confirmation email to the user.
 */
async function sendConfirmationEmail(env, leadData, leadEventId, buyerPhone) {
  const firstName = leadData.firstName || 'there';
  const subject = `We got your info, ${firstName} — here's what happens next`;

  const html = buildConfirmationHtml(firstName, leadData, buyerPhone);
  const text = buildConfirmationText(firstName, leadData, buyerPhone);

  const result = await sendEmail(env, {
    from: 'Kirk at Tax Peace Now <kirk@taxpeacenow.com>',
    to: leadData.email,
    subject,
    html,
    text,
    replyTo: 'hello@taxpeacenow.com',
  });

  await logEmailSend(env, {
    leadEventId,
    emailType: 'confirmation',
    toAddress: leadData.email,
    subject,
    resendId: result.id,
    status: result.success ? 'sent' : 'failed',
  });

  return result;
}

/**
 * Send internal notification to configured recipients.
 */
async function sendInternalNotification(env, leadData, buyerName, leadEventId) {
  const notifyList = (env.NOTIFY_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  if (notifyList.length === 0) {
    console.warn('NOTIFY_EMAILS not set — skipping internal notification');
    return;
  }

  const debtAmount = leadData.debt_amount || leadData.back_taxes_amount || leadData.notice_amount || 'Not specified';
  const subject = `New TPN Lead: ${leadData.firstName} ${leadData.lastName} — ${leadData.state || '??'} — ${debtAmount}`;

  const html = buildInternalNotificationHtml(leadData, buyerName, debtAmount);
  const text = buildInternalNotificationText(leadData, buyerName, debtAmount);

  const result = await sendEmail(env, {
    from: 'TPN Leads <leads@taxpeacenow.com>',
    to: notifyList,
    subject,
    html,
    text,
  });

  await logEmailSend(env, {
    leadEventId,
    emailType: 'internal_notification',
    toAddress: notifyList.join(', '),
    subject,
    resendId: result.id,
    status: result.success ? 'sent' : 'failed',
  });

  return result;
}


// ============================================================
// EMAIL TEMPLATES
// ============================================================

function buildConfirmationHtml(firstName, data, buyerPhone) {
  const phoneDigits = buyerPhone ? buyerPhone.replace(/\D/g, '') : '';
  const phoneDisplay = buyerPhone || '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial,sans-serif; color:#1a1a1a; font-size:16px; line-height:1.6;">
  <div style="max-width:560px; padding:24px;">
    <p>Hey ${firstName},</p>
    <p>Thanks for completing your free tax assessment. I wanted to personally let you know — we've received your information and matched you with one of our trusted tax specialists.</p>
    <p>Here's what happens next:</p>
    <p><strong>Step 1 — Review (happening now)</strong><br>A licensed tax professional from our partner network is reviewing your specific situation to determine the best options available to you.</p>
    <p><strong>Step 2 — Free Consultation Call</strong><br>One of our vetted specialists will reach out within one business day to discuss your options — no obligation, no pressure. Just a straightforward conversation about what they can do for you.</p>
    <p><strong>Step 3 — Next Steps</strong><br>After your consultation, you'll have a clear picture of your options and can decide how you'd like to move forward.</p>
    <p>In the meantime, <strong>keep an eye on your phone</strong> — you should expect a call within one business day${buyerPhone ? ` from <strong><a href="tel:${phoneDigits}" style="color:#1a1a1a; text-decoration:none;">${phoneDisplay}</a></strong>` : ''}.</p>
    <p>You're in good hands. Tax issues feel overwhelming, but they're solvable — and we only work with professionals who do this every day.</p>
    <p>— Kirk<br><span style="color:#888;">Tax Peace Now</span></p>
  </div>
</body>
</html>`;
}

function buildConfirmationText(firstName, data, buyerPhone) {
  return `Hey ${firstName},

Thanks for completing your free tax assessment. We've received your information and matched you with one of our trusted tax specialists.

Here's what happens next:

1. REVIEW (happening now) — A licensed tax professional from our partner network is reviewing your specific situation.

2. FREE CONSULTATION CALL — One of our vetted specialists will reach out within 1 business day to discuss your options. No obligation, no pressure.

3. NEXT STEPS — After your consultation, you'll have a clear picture of your options and can decide how you'd like to move forward.

Keep an eye on your phone — you should expect a call within one business day${buyerPhone ? ` from ${buyerPhone}` : ''}.

You're in good hands. Tax issues feel overwhelming, but they're solvable — and we only work with professionals who do this every day.

— Kirk
Tax Peace Now
https://taxpeacenow.com

Questions? Reply to this email or call (888) 900-1040`;
}

function buildInternalNotificationHtml(data, buyerName, debtAmount) {
  const collectionActions = data.collection_actions ||
    (Array.isArray(data.back_taxes_actions) ? data.back_taxes_actions.join(', ') : data.back_taxes_actions) || 'None';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f4f6f8; font-family:'Inter',Arial,sans-serif; color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <tr><td style="background:#1E3A5F; padding:16px 24px;">
          <h2 style="margin:0; font-size:16px; color:#ffffff; font-weight:600;">🟢 New TPN Lead</h2>
        </td></tr>

        <tr><td style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; width:140px; vertical-align:top;">Name</td>
              <td style="padding:6px 0; font-size:14px; font-weight:600;">${data.firstName || ''} ${data.lastName || ''}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Phone</td>
              <td style="padding:6px 0; font-size:14px;"><a href="tel:${(data.phone || '').replace(/\D/g, '')}" style="color:#2D8B6F;">${data.phone || '—'}</a></td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Email</td>
              <td style="padding:6px 0; font-size:14px;"><a href="mailto:${data.email || ''}" style="color:#2D8B6F;">${data.email || '—'}</a></td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">State</td>
              <td style="padding:6px 0; font-size:14px;">${data.state || '—'}</td>
            </tr>
            <tr><td colspan="2" style="padding:12px 0 6px;"><hr style="border:none; border-top:1px solid #e5e7eb;"></td></tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Tax Problem</td>
              <td style="padding:6px 0; font-size:14px;">${data.tax_problem || '—'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Jurisdiction</td>
              <td style="padding:6px 0; font-size:14px;">${data.tax_jurisdiction || '—'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Debt Amount</td>
              <td style="padding:6px 0; font-size:14px; font-weight:600;">${debtAmount}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Collection Actions</td>
              <td style="padding:6px 0; font-size:14px;">${collectionActions}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Unfiled Years</td>
              <td style="padding:6px 0; font-size:14px;">${data.unfiled_years || '—'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Employment</td>
              <td style="padding:6px 0; font-size:14px;">${data.employment_status || data.filing_status || data.business_structure || '—'}</td>
            </tr>
            <tr><td colspan="2" style="padding:12px 0 6px;"><hr style="border:none; border-top:1px solid #e5e7eb;"></td></tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Routed To</td>
              <td style="padding:6px 0; font-size:14px; font-weight:600;">${buyerName || 'Unassigned'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Source</td>
              <td style="padding:6px 0; font-size:14px;">${data.utm_source ? data.utm_source + ' / ' + (data.utm_medium || '') : 'Direct'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:#6b7280; vertical-align:top;">Submitted</td>
              <td style="padding:6px 0; font-size:14px;">${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })}</td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildInternalNotificationText(data, buyerName, debtAmount) {
  return `NEW TPN LEAD

Name: ${data.firstName || ''} ${data.lastName || ''}
Phone: ${data.phone || '—'}
Email: ${data.email || '—'}
State: ${data.state || '—'}

Tax Problem: ${data.tax_problem || '—'}
Jurisdiction: ${data.tax_jurisdiction || '—'}
Debt Amount: ${debtAmount}
Collection Actions: ${data.collection_actions || '—'}
Unfiled Years: ${data.unfiled_years || '—'}
Employment: ${data.employment_status || data.filing_status || data.business_structure || '—'}

Routed To: ${buyerName || 'Unassigned'}
Source: ${data.utm_source ? data.utm_source + ' / ' + (data.utm_medium || '') : 'Direct'}`;
}