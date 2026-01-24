
const { chromium } = require('playwright');
const path = require('path');

async function run() {
    console.log('Starting browser...');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000/admin/avaliacoes');

    // Wait for content
    await page.waitForTimeout(2000);

    const screenshotPath = path.join(process.cwd(), 'dashboard_test.png');
    console.log(`Saving screenshot to ${screenshotPath}...`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await browser.close();
    console.log('Done.');
}

run().catch(err => {
    console.error('Error during screenshot capture:', err);
    process.exit(1);
});
