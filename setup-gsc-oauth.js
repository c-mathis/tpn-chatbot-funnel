// Playwright script to set up Google Search Console API OAuth credentials
// Run with: node setup-gsc-oauth.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🚀 Starting Google Search Console API setup...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down for visibility
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to Google Cloud Console
    console.log('📍 Step 1: Opening Google Cloud Console...');
    await page.goto('https://console.cloud.google.com');
    await page.waitForLoadState('networkidle');

    console.log('\n⏸️  Please log in to your Google account if needed.');
    console.log('Press ENTER when you\'re logged in and see the Cloud Console dashboard...');
    await waitForEnter();

    // Step 2: Check if we need to create a project or select existing
    console.log('\n📍 Step 2: Checking for existing projects...');

    // Try to click project selector
    try {
      await page.click('[aria-label*="Select a project"]', { timeout: 5000 });
      await page.waitForTimeout(1000);

      console.log('\n🤔 Do you want to:');
      console.log('  1. Create a NEW project for GSC MCP');
      console.log('  2. Use an EXISTING project');
      console.log('\nEnter choice (1 or 2): ');

      const choice = await getInput();

      if (choice.trim() === '1') {
        // Create new project
        console.log('\n📍 Creating new project...');
        await page.click('text=New Project');
        await page.waitForTimeout(1000);

        await page.fill('input[name="name"]', 'GSC MCP Server');
        await page.click('button:has-text("Create")');

        console.log('⏳ Waiting for project creation...');
        await page.waitForTimeout(5000);
      } else {
        console.log('\n📋 Please select your existing project from the list.');
        console.log('Press ENTER when done...');
        await waitForEnter();
      }
    } catch (e) {
      console.log('⚠️  Could not find project selector. Continuing...');
    }

    // Step 3: Enable Google Search Console API
    console.log('\n📍 Step 3: Enabling Google Search Console API...');
    await page.goto('https://console.cloud.google.com/apis/library/searchconsole.googleapis.com');
    await page.waitForLoadState('networkidle');

    try {
      const enableButton = await page.locator('button:has-text("Enable"), button:has-text("ENABLE")').first();
      if (await enableButton.isVisible({ timeout: 3000 })) {
        console.log('✅ Clicking ENABLE button...');
        await enableButton.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('✅ API already enabled');
      }
    } catch (e) {
      console.log('✅ API appears to be already enabled');
    }

    // Step 4: Navigate to Credentials
    console.log('\n📍 Step 4: Creating OAuth credentials...');
    await page.goto('https://console.cloud.google.com/apis/credentials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if OAuth consent screen needs configuration
    try {
      const consentButton = await page.locator('text=Configure Consent Screen').first();
      if (await consentButton.isVisible({ timeout: 3000 })) {
        console.log('\n⚠️  OAuth consent screen needs configuration first.');
        console.log('📍 Configuring OAuth consent screen...');
        await consentButton.click();
        await page.waitForTimeout(2000);

        // Select External user type
        try {
          await page.click('input[value="EXTERNAL"]', { timeout: 3000 });
          await page.click('button:has-text("Create")');
          await page.waitForTimeout(2000);
        } catch (e) {
          console.log('⚠️  Could not select user type automatically');
        }

        // Fill in app information
        console.log('\n📝 Please fill in the OAuth consent screen:');
        console.log('  - App name: GSC MCP Server');
        console.log('  - User support email: (your email)');
        console.log('  - Developer contact: (your email)');
        console.log('\nPress ENTER when you\'ve completed the form and clicked SAVE AND CONTINUE...');
        await waitForEnter();

        // Skip scopes page
        try {
          await page.click('button:has-text("Save and Continue")');
          await page.waitForTimeout(1000);
        } catch (e) {}

        // Skip test users
        try {
          await page.click('button:has-text("Save and Continue")');
          await page.waitForTimeout(1000);
        } catch (e) {}

        // Back to dashboard
        try {
          await page.click('button:has-text("Back to Dashboard")');
          await page.waitForTimeout(2000);
        } catch (e) {}

        // Navigate back to credentials
        await page.goto('https://console.cloud.google.com/apis/credentials');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('✅ OAuth consent screen already configured');
    }

    // Create OAuth credentials
    console.log('\n📍 Creating OAuth client ID...');
    await page.click('button:has-text("Create Credentials")');
    await page.waitForTimeout(1000);
    await page.click('text=OAuth client ID');
    await page.waitForTimeout(2000);

    // Select Desktop app
    await page.selectOption('select[name="type"]', 'DESKTOP');
    await page.fill('input[name="name"]', 'GSC MCP - Claude Desktop');

    console.log('📝 Creating credential...');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(3000);

    // Download credentials
    console.log('\n📥 Downloading credentials...');

    // Click download button in the success dialog
    const downloadPromise = page.waitForEvent('download');
    await page.click('button[aria-label*="Download"], a:has-text("Download JSON")');
    const download = await downloadPromise;

    // Save to config directory
    const configDir = path.join(process.env.HOME, '.config', 'gsc-mcp');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const savePath = path.join(configDir, 'client_secret.json');
    await download.saveAs(savePath);

    console.log(`\n✅ Credentials saved to: ${savePath}`);

    // Close the dialog
    try {
      await page.click('button:has-text("OK")');
    } catch (e) {}

    console.log('\n🎉 Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: claude mcp add gsc --transport stdio --scope user -- uvx mcp-gsc');
    console.log(`2. Set environment variable: GSC_OAUTH_CLIENT_SECRETS_FILE="${savePath}"`);
    console.log('3. Restart Claude Desktop to load the MCP server');

  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    console.log('\n💡 You may need to complete some steps manually.');
  } finally {
    console.log('\nPress ENTER to close the browser...');
    await waitForEnter();
    await browser.close();
  }
})();

// Helper functions
async function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.once('data', () => resolve());
  });
}

async function getInput() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.once('data', (chunk) => {
      resolve(chunk.toString());
    });
  });
}
