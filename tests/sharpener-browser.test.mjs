import test from 'node:test';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const host = '.sharpener-view';
const canvas = `${host} canvas`;
const button = action => `.sharpener-controls [data-action="${action}"]`;

async function ready(page) {
  await page.goto(`${base}/`);
  await page.locator(`${host}.is-ready canvas`).waitFor({ state: 'visible' });
  await page.locator(canvas).scrollIntoViewIfNeeded();
}

async function settled(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function expectState(page, name, value) {
  await page.waitForFunction(({ selector, name, value }) => document.querySelector(selector).dataset[name] === String(value), { selector: host, name, value });
}

/** Find an exposed point on real geometry, then let the production viewer hit-test it.
 * This reconstructs the public model/camera without a production debug hook.
 */
async function partPoint(page, action, { yaw = 0.72, pitch = 0.24 } = {}) {
  return page.evaluate(async ({ base, action, yaw, pitch }) => {
    const THREE = await import(`${base}/assets/vendor/three.module.js`);
    const { createSharpener } = await import(`${base}/sharpener-model.js`);
    const model = createSharpener();
    const element = document.querySelector('.sharpener-view');
    const rect = element.querySelector('canvas').getBoundingClientRect();
    model.setClampExtension(Number(element.dataset.clampOpen === 'true'));
    model.setDrawerExtension(Number(element.dataset.drawerOpen === 'true'));
    model.group.updateMatrixWorld(true);
    const camera = new THREE.OrthographicCamera(-1.95 * rect.width / rect.height, 1.95 * rect.width / rect.height, 1.95, -1.95, 0.1, 50);
    camera.position.set(7 * Math.sin(yaw) * Math.cos(pitch), 7 * Math.sin(pitch), 7 * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(0, 0.02, -0.15);
    camera.updateMatrixWorld(true);
    const actionOf = object => {
      while (object) {
        if (object.userData.action) return object.userData.action;
        object = object.parent;
      }
      return null;
    };
    const targets = [];
    model.group.traverse(object => {
      if (object.isMesh && actionOf(object) === action) targets.push(object);
    });
    const preferredName = { clamp: 'Black pencil-feed tab', drawer: 'Clear drawer face', crank: 'Black crank grip' }[action];
    targets.sort((a, b) => Number(b.name === preferredName) - Number(a.name === preferredName));
    const raycaster = new THREE.Raycaster();
    let result = null;
    outer: for (const target of targets) {
      target.geometry.computeBoundingBox();
      const bounds = target.geometry.boundingBox;
      for (const x of [0.5, 0.3, 0.7]) for (const y of [0.5, 0.3, 0.7]) for (const z of [0.5, 0.1, 0.9]) {
        const point = new THREE.Vector3(
          THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, x),
          THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, y),
          THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, z),
        ).applyMatrix4(target.matrixWorld).project(camera);
        if (Math.abs(point.x) > 0.98 || Math.abs(point.y) > 0.98) continue;
        raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
        const first = raycaster.intersectObject(model.group, true)[0];
        if (first && actionOf(first.object) === action) {
          result = { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2, mesh: first.object.name };
          break outer;
        }
      }
    }
    const geometries = new Set(), materials = new Set(), textures = new Set();
    model.group.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    textures.forEach(value => value.dispose());
    if (!result) throw new Error(`No visible ${action} geometry at yaw ${yaw}.`);
    return result;
  }, { base, action, yaw, pitch });
}

test('sharpener interactions and enamel browser acceptance', async t => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined,
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  try {
    await t.test('green enamel persists across the homepage, all blogs, publications, and playground', async () => {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await ready(page);
      await page.locator('[data-enamel="green"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('html').getAttribute('data-enamel'), 'green');
      assert.equal(await page.locator('button[data-enamel="green"]').getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator(canvas).getAttribute('aria-label'), /green/);
      const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
      assert.equal(await page.evaluate(() => localStorage.getItem('notebook-enamel')), 'green');
      for (const path of ['notes/weighted-weak-lorenz.html', 'notes/steering-a-forecasting-model.html', 'notes/oil-and-learned-optimization.html', 'publications.html', 'projects/molecular-game-of-life/', '']) {
        await page.goto(`${base}/${path}`);
        assert.equal(await page.locator('html').getAttribute('data-enamel'), 'green', path);
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()), accent, path);
      }
      await page.close();
    });

    await t.test('front tabs and drawer toggle through clicks on their visible geometry', async () => {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await ready(page);
      const initialImage = await page.locator(canvas).screenshot();
      for (const [action, state] of [['clamp', 'clampOpen'], ['drawer', 'drawerOpen']]) {
        const openPoint = await partPoint(page, action);
        await page.mouse.click(openPoint.x, openPoint.y);
        await expectState(page, state, true);
        assert.equal(await page.locator(button(action)).getAttribute('aria-pressed'), 'true');
        await settled(page);
        assert.notDeepEqual(await page.locator(canvas).screenshot(), initialImage);
        const closePoint = await partPoint(page, action);
        await page.mouse.click(closePoint.x, closePoint.y);
        await expectState(page, state, false);
        assert.equal(await page.locator(button(action)).getAttribute('aria-pressed'), 'false');
      }
      await page.close();
    });

    await t.test('rear crank responds to direct clicks from the default view and after orbiting', async () => {
      const page = await browser.newPage();
      await ready(page);
      const initialPoint = await partPoint(page, 'crank');
      await page.mouse.click(initialPoint.x, initialPoint.y);
      await expectState(page, 'turning', true);
      assert.equal(await page.locator(button('turn')).isDisabled(), true);
      await expectState(page, 'turning', false);
      await page.locator(canvas).focus();
      for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
      await settled(page);
      const point = await partPoint(page, 'crank', { yaw: 0.72 + 10 * 0.18 });
      await page.mouse.click(point.x, point.y);
      await expectState(page, 'turning', true);
      assert.equal(await page.locator(button('turn')).isDisabled(), true);
      await expectState(page, 'turning', false);
      assert.equal(await page.locator(button('turn')).isEnabled(), true);
      await page.close();
    });

    await t.test('a drag starting on a tab rotates without activating it; pointer cancellation never clicks', async () => {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await ready(page);
      const image = await page.locator(canvas).screenshot();
      const point = await partPoint(page, 'clamp');
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await page.mouse.move(point.x + 36, point.y + 6, { steps: 6 });
      await page.mouse.up();
      await settled(page);
      await expectState(page, 'clampOpen', false);
      await expectState(page, 'drawerOpen', false);
      assert.notDeepEqual(await page.locator(canvas).screenshot(), image);
      await page.locator(canvas).press('Home');
      await settled(page);
      const cancelled = await partPoint(page, 'clamp');
      await page.mouse.move(cancelled.x, cancelled.y);
      await page.mouse.down();
      await page.locator(canvas).dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', clientX: cancelled.x, clientY: cancelled.y });
      await page.mouse.up();
      await expectState(page, 'clampOpen', false);
      await page.close();
    });

    await t.test('keyboard controls expose state and reduced motion completes immediately', async () => {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await ready(page);
      for (const [action, state] of [['clamp', 'clampOpen'], ['drawer', 'drawerOpen']]) {
        await page.locator(button(action)).focus();
        await page.keyboard.press('Enter');
        await expectState(page, state, true);
        assert.equal(await page.locator(button(action)).getAttribute('aria-pressed'), 'true');
        await page.keyboard.press('Space');
        await expectState(page, state, false);
      }
      const before = await page.locator(canvas).screenshot();
      await page.locator(button('turn')).focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator(host).getAttribute('data-turning'), 'false');
      assert.equal(await page.locator(button('turn')).isEnabled(), true);
      await settled(page);
      assert.notDeepEqual(await page.locator(canvas).screenshot(), before);
      await page.locator(canvas).focus();
      await page.keyboard.press('h');
      await expectState(page, 'clampOpen', true);
      await page.keyboard.press('b');
      await expectState(page, 'drawerOpen', true);
      await page.close();
    });

    await t.test('touch taps activate parts and vertical swipes still scroll the page', async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 740 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await ready(page);
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 740 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
      }
      await page.locator(canvas).scrollIntoViewIfNeeded();
      await settled(page);
      const point = await partPoint(page, 'clamp');
      await page.touchscreen.tap(point.x, point.y);
      await expectState(page, 'clampOpen', true);
      assert.equal(await page.locator(canvas).evaluate(element => getComputedStyle(element).touchAction), 'pan-y');
      const box = await page.locator(canvas).boundingBox();
      const start = { x: box.x + box.width * 0.7, y: Math.min(box.y + box.height * 0.7, 650) };
      const oldScroll = await page.evaluate(() => scrollY);
      const client = await context.newCDPSession(page);
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
      for (let step = 1; step <= 8; step++) {
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x, y: start.y - step * 18, id: 1 }] });
        await page.waitForTimeout(20);
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForFunction(previous => scrollY > previous + 20, oldScroll);
      await expectState(page, 'clampOpen', true);
      await expectState(page, 'drawerOpen', false);
      await context.close();
    });

    await t.test('context loss cancels turning, shows the green fallback, and restores controls', async () => {
      const page = await browser.newPage();
      await ready(page);
      await page.click('button[data-enamel="green"]');
      const extension = await page.locator(canvas).evaluateHandle(element => element.getContext('webgl2').getExtension('WEBGL_lose_context'));
      assert.equal(await extension.evaluate(value => Boolean(value)), true);
      await page.click(button('turn'));
      await expectState(page, 'turning', true);
      await extension.evaluate(value => value.loseContext());
      await page.locator('.sharpener').waitFor({ state: 'visible' });
      await expectState(page, 'turning', false);
      assert.equal(await page.locator('.sharpener-controls').isVisible(), false);
      assert.match(await page.locator('.sharpener').getAttribute('src'), /angel-5-green\.png$/);
      await extension.evaluate(value => value.restoreContext());
      await page.locator(`${host}.is-ready canvas`).waitFor({ state: 'visible' });
      assert.equal(await page.locator(button('turn')).isEnabled(), true);
      await page.locator(button('clamp')).click();
      await expectState(page, 'clampOpen', true);
      await page.close();
    });

    await t.test('green still preview works when WebGL is unavailable', async () => {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        localStorage.setItem('notebook-enamel', 'green');
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          if (type.startsWith('webgl')) return null;
          return getContext.call(this, type, ...args);
        };
      });
      const page = await context.newPage();
      await page.goto(`${base}/`);
      const preview = page.locator('.sharpener');
      await preview.waitFor({ state: 'visible' });
      assert.equal(await page.locator('html').getAttribute('data-enamel'), 'green');
      assert.match(await preview.getAttribute('src'), /angel-5-green\.png$/);
      assert.match(await preview.getAttribute('alt'), /green/);
      await page.waitForFunction(() => document.querySelector('.sharpener').complete && document.querySelector('.sharpener').naturalWidth > 0);
      assert.equal(await page.locator('.sharpener-controls').isVisible(), false);
      await context.close();
    });
  } finally {
    await browser.close();
  }
});
