/**
 * TPN Lead Fallback - Google Apps Script
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project: "TPN Lead Fallback"
 * 3. Paste this code into Code.gs
 * 4. Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the web app URL
 * 6. Set as Cloudflare Worker secret:
 *    npx wrangler secret put GOOGLE_SHEETS_URL
 *    (paste the URL when prompted)
 *
 * This script will automatically:
 * - Create a new Google Sheet named "TPN Leads Fallback"
 * - Log all incoming leads with timestamps
 * - Handle errors gracefully
 */

// Main POST handler
function doPost(e) {
  try {
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);

    // Get or create the spreadsheet
    const sheet = getOrCreateSheet();

    // Ensure headers exist
    ensureHeaders(sheet);

    // Add the lead data
    addLeadRow(sheet, data);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error processing lead: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get or create the spreadsheet
function getOrCreateSheet() {
  const sheetName = 'TPN Leads Fallback';

  // Try to find existing spreadsheet in Drive
  const files = DriveApp.getFilesByName(sheetName);

  if (files.hasNext()) {
    const file = files.next();
    const ss = SpreadsheetApp.open(file);
    return ss.getSheets()[0];
  }

  // Create new spreadsheet
  const ss = SpreadsheetApp.create(sheetName);
  return ss.getSheets()[0];
}

// Ensure column headers exist
function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      'Timestamp',
      'Event ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'State',
      'Tax Problem',
      'Tax Jurisdiction',
      'Debt Amount',
      'Tax Type',
      'Employment Status',
      'Collection Actions',
      'Unfiled Years',
      'Contact Time',
      'Buyer ID',
      'Source',
      'Page URL',
      'D1 Saved',
      'FB Click ID',
      'FB Cookie (_fbc)',
      'FB Browser ID (_fbp)',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'UTM Content',
      'UTM Term',
      'Landing Page',
      'Referrer'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

// Add a lead row to the sheet
function addLeadRow(sheet, data) {
  // Parse tax_data if it's a JSON string
  let taxData = {};
  if (typeof data.tax_data === 'string') {
    try {
      taxData = JSON.parse(data.tax_data);
    } catch (e) {
      taxData = {};
    }
  } else if (typeof data.tax_data === 'object') {
    taxData = data.tax_data;
  }

  const row = [
    data.ts || data.created_at || new Date().toISOString(),
    data.event_id || '',
    data.first_name || data.firstName || '',
    data.last_name || data.lastName || '',
    data.email || '',
    data.phone || '',
    data.state || '',
    data.tax_problem || data.taxProblem || '',
    data.tax_jurisdiction || data.taxJurisdiction || '',
    taxData.debt_amount || data.debt_amount || data.back_taxes_amount || '',
    taxData.tax_type || data.tax_type || '',
    taxData.employment_status || data.employment_status || '',
    taxData.collection_actions || data.collection_actions || '',
    taxData.unfiled_years || data.unfiled_years || '',
    taxData.contactTime || data.contactTime || '',
    data.buyer_id || '',
    data.source || 'Tax Peace Now Chatbot',
    data.page_url || '',
    data.d1_saved ? 'YES' : 'NO',
    data.fbclid || '',
    data.fbc || '',
    data.fbp || '',
    data.utm_source || '',
    data.utm_medium || '',
    data.utm_campaign || '',
    data.utm_content || '',
    data.utm_term || '',
    data.landing_page || '',
    data.referrer || ''
  ];

  sheet.appendRow(row);
}

// Test function (optional - run this to verify setup)
function testScript() {
  const testData = {
    event_id: 'test_' + Date.now(),
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    phone: '555-123-4567',
    state: 'California',
    tax_problem: 'back-taxes',
    tax_jurisdiction: 'irs',
    tax_data: JSON.stringify({
      debt_amount: '$10,000 - $25,000',
      tax_type: 'Personal Income Tax',
      employment_status: 'Self-employed',
      contactTime: 'Morning'
    }),
    source: 'Test',
    ts: new Date().toISOString(),
    d1_saved: false
  };

  const sheet = getOrCreateSheet();
  ensureHeaders(sheet);
  addLeadRow(sheet, testData);

  Logger.log('Test lead added successfully!');
  Logger.log('Check your spreadsheet: TPN Leads Fallback');
}
