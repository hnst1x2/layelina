import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const URL = process.env.URL || 'https://layelina.onrender.com';
const OUT = './test-screenshots';
const VIEWPORTS = [
  { name: '320-iphone-se',     width: 320,  height: 568 },
  { name: '375-iphone-13',     width: 375,  height: 812 },
  { name: '414-iphone-pro',    width: 414,  height: 896 },
  { name: '768-ipad-portrait', width: 768,  height: 1024 },
  { name: '1024-ipad-landscape', width: 1024, height: 768 },
  { name: '1440-laptop',       width: 1440, height: 900 },
];

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const issues = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(800); // let fonts/animations settle

  // Capture above-the-fold
  await page.screenshot({ path: `${OUT}/${vp.name}-hero.png`, fullPage: false });

  // Capture full page
  await page.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true });

  // Diagnostics
  const diagnostics = await page.evaluate(() => {
    const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > document.documentElement.clientWidth + 1 && rect.width > 0 && rect.height > 0) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '';
        overflowing.push(`${tag}${cls} (right=${Math.round(rect.right)}, w=${Math.round(rect.width)})`);
      }
    });

    const header = document.querySelector('.site-header');
    const headerH = header ? header.offsetHeight : 0;
    const heroLogo = document.querySelector('.hero-logo');
    const heroLogoBox = heroLogo ? heroLogo.getBoundingClientRect() : null;
    const navToggle = document.querySelector('.nav-toggle');
    const navToggleVisible = navToggle ? getComputedStyle(navToggle).display !== 'none' : false;

    return {
      horizontalOverflow,
      docWidth: document.documentElement.clientWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      overflowing: overflowing.slice(0, 8),
      headerH,
      heroLogoWidth: heroLogoBox?.width ? Math.round(heroLogoBox.width) : null,
      heroLogoTop: heroLogoBox?.top ? Math.round(heroLogoBox.top) : null,
      navToggleVisible,
    };
  });

  if (diagnostics.horizontalOverflow) {
    issues.push(`[${vp.name}] HORIZONTAL OVERFLOW: scrollWidth=${diagnostics.docScrollWidth} > clientWidth=${diagnostics.docWidth}`);
    if (diagnostics.overflowing.length) issues.push(`  → ${diagnostics.overflowing.join(' | ')}`);
  }
  if (diagnostics.heroLogoTop !== null && diagnostics.heroLogoTop < diagnostics.headerH) {
    issues.push(`[${vp.name}] Hero logo top=${diagnostics.heroLogoTop} hidden under header h=${diagnostics.headerH}`);
  }
  if (consoleErrors.length) {
    issues.push(`[${vp.name}] Console errors: ${consoleErrors.join(' | ')}`);
  }

  console.log(`✓ ${vp.name} (${vp.width}×${vp.height})  header=${diagnostics.headerH}px  heroLogo=${diagnostics.heroLogoWidth}px  navBurger=${diagnostics.navToggleVisible ? 'shown' : 'hidden'}  overflow=${diagnostics.horizontalOverflow}`);

  await ctx.close();
}

await browser.close();

if (issues.length) {
  console.log('\n=== ISSUES FOUND ===');
  for (const i of issues) console.log(i);
  process.exit(1);
} else {
  console.log('\n=== ALL VIEWPORTS PASS ===');
}
