const fs = require('node:fs');
const crypto = require('node:crypto');

async function main() {
  const version = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
  const apk = fs.readFileSync('public/downloads/PomoFocus-v8.1.apk');
  const digest = data => crypto.createHash('sha256').update(data).digest('hex');
  const local = { version: version.version, versionCode: version.versionCode, bytes: apk.length, sha256: digest(apk), apkSizeMb: Number((apk.length / 1024 / 1024).toFixed(2)) };
  if (local.sha256 !== version.checksumSha256 || local.apkSizeMb !== version.apkSizeMb) throw new Error('Local APK metadata differs from binary');
  const localHtml = fs.readFileSync('dist/index.html', 'utf8');
  const entry = localHtml.match(/src="([^"]*\/assets\/index-[^"]+\.js)"/)?.[1];
  const domains = ['pomofocus-workspace.vercel.app', 'pomofocus-workplace.vercel.app'];
  const production = await Promise.all(domains.map(async domain => {
    const read = path => fetch(`https://${domain}${path}?phase4b=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(60000) });
    const [home, metadata, binary] = await Promise.all([read('/'), read('/version.json'), read('/downloads/PomoFocus-v8.1.apk')]);
    const html = await home.text(), remote = await metadata.json(), bytes = Buffer.from(await binary.arrayBuffer());
    const result = { domain, homeStatus: home.status, versionStatus: metadata.status, apkStatus: binary.status, version: remote.version, versionCode: remote.versionCode, apkBytes: bytes.length, apkSha256: digest(bytes), entryMatches: Boolean(entry && html.includes(entry)) };
    result.matches = home.status === 200 && metadata.status === 200 && binary.status === 200 && remote.version === local.version && remote.versionCode === local.versionCode && remote.checksumSha256 === local.sha256 && result.apkSha256 === local.sha256 && bytes.length === local.bytes && result.entryMatches;
    return result;
  }));
  const result = { verifiedAt: new Date().toISOString(), local, production };
  fs.writeFileSync('artifacts/phase4b/production-verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (production.some(item => !item.matches)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
