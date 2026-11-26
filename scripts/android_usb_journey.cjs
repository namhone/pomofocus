// Physical-device checks. No CDP attachment before visual checks: it can force a repaint.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { PNG } = require('playwright-core/lib/utilsBundle');
const adb = process.env.ADB_PATH || 'D:/Android/Sdk/platform-tools/adb.exe';
const serial = process.argv[2];
if (!serial) throw new Error('Usage: node scripts/android_usb_journey.cjs <adb-serial>');
const app = 'com.pomofocus.workspace';
const out = path.resolve('tests/results/android-smoke/journey');
fs.mkdirSync(out, { recursive: true });
const result = { model: '', checks: [], passed: false };
const run = (...args) => execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 30000 }).trim();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function nodes(xml) {
  return [...xml.matchAll(/<node\b[^>]*>/g)].map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v])));
}
function tree() {
  run('shell', 'uiautomator', 'dump', '/sdcard/pomo-journey.xml');
  return nodes(run('shell', 'cat', '/sdcard/pomo-journey.xml'));
}
function find(list, label) { return list.find(n => n['content-desc'] === label || n.text === label); }
function point(node) {
  if (!node) throw new Error('Control absent from physical accessibility tree');
  const b = node.bounds.match(/\d+/g).map(Number);
  return [Math.round((b[0] + b[2]) / 2), Math.round((b[1] + b[3]) / 2)];
}
function tap(list, label) { run('shell', 'input', 'tap', ...point(find(list, label)).map(String)); }
function screenshot(name) {
  const bytes = execFileSync(adb, ['-s', serial, 'exec-out', 'screencap', '-p'], { timeout: 30000, maxBuffer: 20000000 });
  fs.writeFileSync(path.join(out, name + '.png'), bytes);
  const image = PNG.sync.read(bytes); let bright = 0;
  // Exclude status/navigation bars; a black app with a white clock in the status bar must fail.
  for (let y = Math.floor(image.height * .15); y < image.height * .85; y += 8) {
    for (let x = Math.floor(image.width * .05); x < image.width * .95; x += 8) {
      const i = (y * image.width + x) * 4;
      if (image.data[i] > 180 && image.data[i + 1] > 180 && image.data[i + 2] > 180) bright++;
    }
  }
  if (bright < 20) throw new Error(name + ': captured app surface is black');
  return bright;
}
async function ready(name) {
  let list = tree();
  if (!find(list, 'Bắt đầu đếm giờ') && !find(list, 'Tạm dừng đồng hồ')) {
    await wait(1000); list = tree();
  }
  if (!find(list, 'Bắt đầu đếm giờ') && !find(list, 'Tạm dừng đồng hồ')) {
    screenshot(name + '-missing-controls');
    throw new Error(name + ': timer controls not available (check keyguard/boot)');
  }
  const brightSamples = screenshot(name);
  result.checks.push({ name, pass: true, brightSamples });
  return list;
}
const time = list => list.find(n => n.package === app && /^\d{2}:\d{2}$/.test(n.text))?.text;
const seconds = value => { if (!value) throw new Error('Timer text missing'); const [m, s] = value.split(':').map(Number); return m * 60 + s; };
async function main() {
  result.model = run('shell', 'getprop', 'ro.product.model');
  for (let i = 1; i <= 3; i++) {
    run('shell', 'am', 'force-stop', app);
    const started = Date.now(); run('shell', 'am', 'start', '-W', '-n', app + '/.MainActivity');
    await ready('cold-' + i); result.checks.at(-1).elapsedMs = Date.now() - started;
  }
  let list = tree();
  if (find(list, 'Tạm dừng đồng hồ')) { tap(list, 'Tạm dừng đồng hồ'); list = await ready('initial-pause'); }
  const before = seconds(time(list));
  tap(list, 'Bắt đầu đếm giờ'); await wait(2200); list = await ready('play');
  if (!find(list, 'Tạm dừng đồng hồ') || seconds(time(list)) >= before) throw new Error('Physical Play/countdown failed');
  tap(list, 'Tạm dừng đồng hồ'); list = await ready('pause');
  if (!find(list, 'Bắt đầu đếm giờ') || !list.some(n => n.text === 'Tạm dừng')) throw new Error('Physical touch Pause failed');
  const paused = time(list); await wait(2200); list = tree();
  if (time(list) !== paused) throw new Error('Timer kept counting while paused');
  tap(list, 'Bắt đầu đếm giờ'); await wait(2200); list = await ready('resume');
  if (!find(list, 'Tạm dừng đồng hồ') || seconds(time(list)) >= seconds(paused)) throw new Error('Physical Resume failed');
  tap(list, 'Khóa màn hình bỏ túi'); list = tree(); screenshot('pocket-lock');
  const unlock = find(list, 'Nhấn giữ để mở khóa');
  const [x, y] = point(unlock).map(String);
  run('shell', 'input', 'swipe', x, y, x, y, '1800');
  await ready('pocket-unlock');
  run('shell', 'input', 'keyevent', '223'); await wait(1500);
  run('shell', 'input', 'keyevent', '224'); run('shell', 'wm', 'dismiss-keyguard');
  run('shell', 'am', 'start', '-W', '-n', app + '/.MainActivity'); await ready('screen-unlock');
  for (let i = 1; i <= 3; i++) {
    run('shell', 'input', 'keyevent', '3'); await wait(1200);
    run('shell', 'am', 'start', '-W', '-n', app + '/.MainActivity'); await ready('return-' + i);
  }
  list = tree(); if (find(list, 'Tạm dừng đồng hồ')) tap(list, 'Tạm dừng đồng hồ');
  await ready('final-paused'); result.passed = true;
}
main().catch(error => { result.error = error.message; process.exitCode = 1; }).finally(() => {
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(result, null, 2));
  try { run('shell', 'rm', '-f', '/sdcard/pomo-journey.xml'); } catch {}
  console.log(JSON.stringify(result, null, 2));
});
