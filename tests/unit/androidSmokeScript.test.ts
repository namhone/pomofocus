import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const compiler = 'C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe';
const release = JSON.parse(readFileSync('public/version.json', 'utf8'));
let sandbox: string, fakeAdb: string;
describe.skipIf(process.platform !== 'win32' || !existsSync(compiler))('Android smoke script with an external fake ADB (no phone access)', () => {
  beforeAll(() => {
    sandbox = mkdtempSync(path.join(tmpdir(), 'pomo-android-smoke-'));
    fakeAdb = path.join(sandbox, 'fake-adb.exe');
    execFileSync(compiler, ['/nologo', '/target:exe', '/out:' + fakeAdb, path.resolve('tests/fixtures/android-smoke-adb.cs')], { timeout: 30000 });
  });
  function run(scenario: string, extra: string[] = []) {
    const output = mkdtempSync(path.join(sandbox, scenario + '-'));
    const commands = path.join(output, 'commands.txt');
    const result = spawnSync('pwsh', ['-NoProfile', '-File', path.resolve('scripts/android_smoke_check.ps1'), '-AdbPath', fakeAdb, '-OutputDirectory', output, '-ObserveSeconds', '2', ...extra], {
      encoding: 'utf8', timeout: 30000,
      env: { ...process.env, POMO_SMOKE_SCENARIO: scenario, POMO_SMOKE_COMMANDS_FILE: commands, POMO_SMOKE_VERSION: release.version, POMO_SMOKE_CODE: String(release.versionCode) }
    });
    return { result, output, commands: readFileSync(commands, 'utf8') };
  }
  it('CheckOnly validates the release but never inspects, installs or launches a device', () => {
    const { result, commands } = run('healthy', ['-CheckOnly']);
    expect(result.status, result.stderr).toBe(0); expect(commands.trim()).toBe('version');
  });
  it.each(['none', 'unauthorized', 'multiple'])('refuses installation when the device state is %s', scenario => {
    const { result, commands } = run(scenario);
    expect(result.status).toBe(1); expect(commands).not.toContain('install'); expect(commands).not.toContain('am start');
  });
  it('targets one serial, checks installed version, routes the callback and redacts credentials', () => {
    const { result, output, commands } = run('healthy');
    expect(result.status, result.stderr).toBe(0);
    expect(commands).toContain('-s contract-device install -r ');
    expect(commands).toContain('pomofocus://oauth/callback');
    const summary = JSON.parse(readFileSync(path.join(output, 'summary.json'), 'utf8'));
    expect(summary).toMatchObject({ passed: true, version: release.version, versionCode: release.versionCode, realOAuthLogin: 'not tested' });
    const log = readFileSync(path.join(output, 'logcat.txt'), 'utf8');
    expect(log).not.toContain('fixture-secret'); expect(log).not.toContain('fixture-code');
    expect(commands).not.toMatch(/logcat -c|pm clear/);
  });
  it.each(['crash', 'webview', 'audio', 'route-fail', 'startup-crash'])('fails with evidence for %s', scenario => {
    const { result, output } = run(scenario);
    expect(result.status, result.stdout + result.stderr).toBe(1);
    if (scenario === 'startup-crash') expect(readFileSync(path.join(output, 'startup-crash.txt'), 'utf8')).toContain('com.pomofocus.workspace');
    else if (scenario !== 'route-fail') expect(JSON.parse(readFileSync(path.join(output, 'summary.json'), 'utf8')).passed).toBe(false);
  });
});
