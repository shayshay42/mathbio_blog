import test from 'node:test';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const linkedIn = 'https://ca.linkedin.com/in/hshay';

async function ready(page) {
  await page.goto(`${base}/`);
  await page.locator('.portrait-person').waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const image = document.querySelector('.portrait-person');
    return image.complete && image.naturalWidth > 0;
  });
  await page.locator('.portrait-view').scrollIntoViewIfNeeded();
}

async function hoverEdge(page) {
  const box = await page.locator('.portrait-view').boundingBox();
  await page.mouse.move(box.x + box.width * 0.88, box.y + box.height * 0.15);
}

const portraitFile = color => color === 'blue' ? 'shayan-cutout.png' : `shayan-cutout-${color}.png`;

async function expectPortrait(page, color) {
  await page.waitForFunction(({ color, filename }) => {
    const image = document.querySelector('.portrait-person');
    return image.dataset.enamel === color && image.complete && image.naturalWidth > 0
      && image.currentSrc.endsWith(`/assets/portrait/${filename}`);
  }, { color, filename: portraitFile(color) });
  assert.match(await page.locator('.portrait-person').getAttribute('alt'), new RegExp(`${color} fleece`));
}

test('portrait browser acceptance', async t => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined,
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  try {
    await t.test('mouse movement tilts the portrait and pointer exit settles without idle animation', async () => {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await ready(page);
      await hoverEdge(page);
      await page.waitForFunction(() => {
        const style = document.querySelector('.portrait-scene').style;
        return Math.abs(parseFloat(style.getPropertyValue('--portrait-x'))) > 1
          && Math.abs(parseFloat(style.getPropertyValue('--portrait-y'))) > 1;
      });
      await page.waitForFunction(() => !document.querySelector('.portrait-view').classList.contains('is-tilting'));
      assert.equal(await page.locator('.portrait-scene').evaluate(element => getComputedStyle(element).willChange), 'auto');
      await page.mouse.move(0, 0);
      await page.waitForFunction(() => {
        const style = document.querySelector('.portrait-scene').style;
        return parseFloat(style.getPropertyValue('--portrait-x')) === 0
          && parseFloat(style.getPropertyValue('--portrait-y')) === 0
          && !document.querySelector('.portrait-view').classList.contains('is-tilting');
      });
      assert.deepEqual(errors, []);
      await page.close();
    });

    await t.test('the portrait is one native LinkedIn link reached and activated by keyboard', async () => {
      const page = await browser.newPage();
      await ready(page);
      assert.equal(await page.locator('.portrait-link').getAttribute('href'), linkedIn);
      assert.equal(await page.locator('.portrait-link').getAttribute('aria-label'), 'Shayan Hajhashemi on LinkedIn');
      assert.equal(await page.locator('.portrait-link [tabindex], .portrait-link button, .portrait-link a').count(), 0);
      await page.locator('.site-nav a').last().focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.portrait-link').evaluate(element => element === document.activeElement && element.matches(':focus-visible')), true);
      await page.waitForFunction(() => parseFloat(document.querySelector('.portrait-scene').style.getPropertyValue('--portrait-y')) > 1);
      await page.route(`${linkedIn}**`, route => route.fulfill({ contentType: 'text/html', body: '<title>LinkedIn destination</title>' }));
      await Promise.all([page.waitForURL(linkedIn), page.keyboard.press('Enter')]);
      await page.close();
    });

    await t.test('reduced motion prevents pointer and focus tilt and stops an existing tilt', async () => {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await ready(page);
      await hoverEdge(page);
      await page.locator('.portrait-link').focus();
      assert.equal(await page.locator('.portrait-scene').evaluate(element => getComputedStyle(element).transform), 'none');
      assert.equal(await page.locator('.portrait-view').evaluate(element => element.classList.contains('is-tilting')), false);
      await page.locator('.portrait-link').blur();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.mouse.move(0, 0);
      await hoverEdge(page);
      await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('.portrait-scene').style.getPropertyValue('--portrait-y'))) > 1);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => {
        const scene = document.querySelector('.portrait-scene');
        return getComputedStyle(scene).transform === 'none'
          && parseFloat(scene.style.getPropertyValue('--portrait-y')) === 0
          && !document.querySelector('.portrait-view').classList.contains('is-tilting');
      });
      assert.equal(await page.locator('.portrait-scene').evaluate(element => parseFloat(element.style.getPropertyValue('--portrait-y'))), 0);
      assert.equal(await page.locator('.portrait-view').evaluate(element => element.classList.contains('is-tilting')), false);
      await page.close();
    });

    await t.test('portrait and notes layout fits mobile, tablet, and desktop while tilted', async () => {
      const page = await browser.newPage();
      await ready(page);
      for (const width of [320, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 850 });
        await page.locator('.portrait-view').scrollIntoViewIfNeeded();
        await hoverEdge(page);
        await page.waitForFunction(() => !document.querySelector('.portrait-view').classList.contains('is-tilting'));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `horizontal overflow at ${width}px`);
        const box = await page.locator('.portrait-person').boundingBox();
        assert.ok(box.width > 100 && box.height > 100, `portrait has usable dimensions at ${width}px`);
      }
      await page.close();
    });

    await t.test('all four enamel choices update the sweater and the saved choice survives reload', async () => {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await ready(page);
      for (const color of ['red', 'blue', 'black', 'green']) {
        await page.click(`button[data-enamel="${color}"]`);
        await expectPortrait(page, color);
        assert.equal(await page.locator('html').getAttribute('data-enamel'), color);
        assert.equal(await page.locator(`button[data-enamel="${color}"]`).getAttribute('aria-pressed'), 'true');
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('notebook-enamel')), 'green');
      await page.reload();
      await expectPortrait(page, 'green');
      await page.close();
    });

    await t.test('a slow sweater image stays hidden while loading and cannot replace a newer choice', async () => {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await ready(page);
      await expectPortrait(page, 'red');
      let release;
      const held = new Promise(resolve => { release = resolve; });
      let requested;
      const requestedImage = new Promise(resolve => { requested = resolve; });
      await page.route('**/assets/portrait/shayan-cutout-black.png', async route => {
        requested();
        await held;
        await route.continue();
      });
      await page.click('button[data-enamel="black"]');
      await requestedImage;
      await expectPortrait(page, 'red');
      assert.equal(await page.locator('.portrait-person').isVisible(), true);
      await page.click('button[data-enamel="blue"]');
      await page.click('button[data-enamel="green"]');
      await expectPortrait(page, 'green');
      const response = page.waitForResponse('**/assets/portrait/shayan-cutout-black.png');
      release();
      await (await response).finished();
      await page.waitForTimeout(150);
      await expectPortrait(page, 'green');
      assert.equal(await page.locator('html').getAttribute('data-enamel'), 'green');
      await page.close();
    });

    await t.test('a failed sweater image preserves the photograph and can be retried', async () => {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await ready(page);
      await page.click('button[data-enamel="blue"]');
      await expectPortrait(page, 'blue');
      await page.route('**/assets/portrait/shayan-cutout-green.png', route => route.abort());
      await Promise.all([
        page.waitForEvent('requestfailed', { predicate: request => request.url().endsWith('/assets/portrait/shayan-cutout-green.png') }),
        page.click('button[data-enamel="green"]'),
      ]);
      await expectPortrait(page, 'blue');
      assert.equal(await page.locator('.portrait-person').isVisible(), true);
      assert.equal(await page.locator('html').getAttribute('data-enamel'), 'green');
      await page.unroute('**/assets/portrait/shayan-cutout-green.png');
      await page.click('button[data-enamel="green"]');
      await expectPortrait(page, 'green');
      await page.close();
    });

    await t.test('the photograph and native link work without JavaScript or WebGL', async () => {
      for (const mode of ['no-javascript', 'no-webgl']) {
        const context = await browser.newContext({ javaScriptEnabled: mode !== 'no-javascript' });
        if (mode === 'no-webgl') {
          await context.addInitScript(() => {
            const getContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(type, ...args) {
              if (type.startsWith('webgl')) return null;
              return getContext.call(this, type, ...args);
            };
          });
        }
        const page = await context.newPage();
        await ready(page);
        assert.equal(await page.locator('.portrait-person').isVisible(), true, mode);
        assert.equal(await page.locator('.portrait-person').evaluate(image => image.complete && image.naturalWidth > 0), true, mode);
        if (mode === 'no-javascript') {
          assert.equal(await page.locator('.portrait-person').evaluate(image => image.currentSrc.endsWith('/assets/portrait/shayan-cutout.png')), true);
        }
        assert.equal(await page.locator('.portrait-link').getAttribute('href'), linkedIn, mode);
        assert.equal(await page.locator('.portrait-view canvas').count(), 0, mode);
        await page.route(`${linkedIn}**`, route => route.fulfill({ contentType: 'text/html', body: '<title>LinkedIn destination</title>' }));
        await Promise.all([page.waitForURL(linkedIn), page.locator('.portrait-link').click()]);
        await context.close();
      }
    });
  } finally {
    await browser.close();
  }
});
