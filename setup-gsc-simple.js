// Simple script - opens browser to the right pages
// You complete the steps manually in the UI

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage();

  console.log('\n📋 GSC MCP Setup - Manual Steps\n');
  console.log('Opening browser windows for you...\n');

  // Step 1: Enable API
  console.log('Step 1: Enable Google Search Console API');
  console.log('→ Click the ENABLE button');
  await page.goto('https://console.cloud.google.com/apis/library/searchconsole.googleapis.com');
  await page.waitForTimeout(3000);

  console.log('\nStep 2: Configure OAuth Consent Screen (if needed)');
  console.log('→ If prompted, select "External" and fill in:');
  console.log('   - App name: GSC MCP Server');
  console.log('   - Support email: (your email)');
  console.log('   - Developer email: (your email)');

  console.log('\nStep 3: Create OAuth Credentials');
  console.log('→ Opening credentials page in new tab in 5 seconds...');
  await page.waitForTimeout(5000);

  const page2 = await browser.newPage();
  await page2.goto('https://console.cloud.google.com/apis/credentials/oauthclient');

  console.log('\n→ Fill in the form:');
  console.log('   - Application type: Desktop app');
  console.log('   - Name: GSC MCP - Claude');
  console.log('   - Click CREATE');
  console.log('   - Click DOWNLOAD JSON');
  console.log('   - Save file to: ~/.config/gsc-mcp/client_secret.json');

  console.log('\n✅ Complete the steps above, then return here and press Ctrl+C');
  console.log('💡 Or just close this window when done\n');

  // Keep browser open
  await page.waitForTimeout(1000000);
})();
