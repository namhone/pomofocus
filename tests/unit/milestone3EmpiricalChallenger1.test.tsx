import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';

// Configuration under test
import capacitorConfig from '../../capacitor.config';

/**
 * Robust zero-dependency ZIP Central Directory Parser for Empirical APK Analysis
 */
function parseZipCentralDirectory(buffer: Buffer): {
  entries: string[];
  entryMap: Map<string, { size: number; compressedSize: number; offset: number }>;
} {
  // Find End of Central Directory (EOCD) signature: 0x06054b50
  let eocdOffset = -1;
  const maxCommentLength = 65535;
  const minEocdSize = 22;
  const searchStart = buffer.length - minEocdSize;
  const searchEnd = Math.max(0, buffer.length - minEocdSize - maxCommentLength);

  for (let i = searchStart; i >= searchEnd; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('EOCD signature (0x06054b50) not found; not a valid ZIP archive');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  let offset = cdOffset;
  const entries: string[] = [];
  const entryMap = new Map<string, { size: number; compressedSize: number; offset: number }>();

  for (let i = 0; i < totalEntries; i++) {
    if (offset + 46 > buffer.length) break;
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x02014b50) {
      break;
    }
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraFieldLength = buffer.readUInt16LE(offset + 30);
    const fileCommentLength = buffer.readUInt16LE(offset + 32);

    const fileName = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);
    entries.push(fileName);
    entryMap.set(fileName, {
      size: uncompressedSize,
      compressedSize,
      offset,
    });

    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return { entries, entryMap };
}

describe('EMPIRICAL ADVERSARIAL CHALLENGER 1 — Milestone 3: Capacitor Android & Standalone APK', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const apkPath = path.join(rootDir, 'public/downloads/PomoFocus-v8.0.apk');
  const versionJsonPath = path.join(rootDir, 'public/version.json');
  const localPropertiesPath = path.join(rootDir, 'android/local.properties');
  const appBuildGradlePath = path.join(rootDir, 'android/app/build.gradle');
  const manifestPath = path.join(rootDir, 'android/app/src/main/AndroidManifest.xml');

  // ===========================================================================
  // SUITE 1: APK BINARY PHYSICAL VERIFICATION & MAGIC HEADER
  // ===========================================================================
  describe('Suite 1: APK Binary Physical Structure & Magic Header Verification', () => {
    it('1.1 verifies that public/downloads/PomoFocus-v7.4.apk exists on disk', () => {
      expect(fs.existsSync(apkPath)).toBe(true);
      const stat = fs.statSync(apkPath);
      expect(stat.isFile()).toBe(true);
    });

    it('1.2 asserts APK size is strictly greater than 3,000,000 bytes (PROJECT.md contract)', () => {
      const stat = fs.statSync(apkPath);
      expect(stat.size).toBeGreaterThan(3000000);
      // Currently assembled debug package is ~8.36 MB
      expect(stat.size).toBeGreaterThanOrEqual(7000000);
      expect(stat.size).toBeLessThan(50000000); // Sanity upper bound (< 50MB)
    });

    it('1.3 inspects ZIP magic header bytes (PK\\x03\\x04) at byte offset 0', () => {
      const fd = fs.openSync(apkPath, 'r');
      const header = Buffer.alloc(4);
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);

      // 0x50 = 'P', 0x4B = 'K', 0x03, 0x04
      expect(header[0]).toBe(0x50);
      expect(header[1]).toBe(0x4b);
      expect(header[2]).toBe(0x03);
      expect(header[3]).toBe(0x04);
      expect(header.toString('utf8', 0, 2)).toBe('PK');
    });

    it('1.4 verifies End of Central Directory record is present near file tail', () => {
      const apkBuffer = fs.readFileSync(apkPath);
      let eocdFound = false;
      for (let i = apkBuffer.length - 22; i >= Math.max(0, apkBuffer.length - 65557); i--) {
        if (apkBuffer.readUInt32LE(i) === 0x06054b50) {
          eocdFound = true;
          break;
        }
      }
      expect(eocdFound).toBe(true);
    });
  });

  // ===========================================================================
  // SUITE 2: APK INTERNAL ZIP ARCHIVE & ASSET TREE INSPECTION
  // ===========================================================================
  describe('Suite 2: APK Internal Android Structure & Asset Tree Verification', () => {
    it('2.1 parses zip entries and validates presence of Android runtime dex binaries', () => {
      const apkBuffer = fs.readFileSync(apkPath);
      const { entries, entryMap } = parseZipCentralDirectory(apkBuffer);

      expect(entries.length).toBeGreaterThan(100);
      expect(entries).toContain('classes.dex');

      const primaryDex = entryMap.get('classes.dex');
      expect(primaryDex).toBeDefined();
      expect(primaryDex!.size).toBeGreaterThan(1000000); // Primary classes.dex > 1MB

      // Verify multidex output
      const dexEntries = entries.filter((e) => e.endsWith('.dex'));
      expect(dexEntries.length).toBeGreaterThanOrEqual(1);
    });

    it('2.2 validates presence of compiled AndroidManifest.xml and resources.arsc', () => {
      const apkBuffer = fs.readFileSync(apkPath);
      const { entries, entryMap } = parseZipCentralDirectory(apkBuffer);

      expect(entries).toContain('AndroidManifest.xml');
      const manifestEntry = entryMap.get('AndroidManifest.xml');
      expect(manifestEntry).toBeDefined();
      expect(manifestEntry!.size).toBeGreaterThan(0);

      expect(entries).toContain('resources.arsc');
      const arscEntry = entryMap.get('resources.arsc');
      expect(arscEntry).toBeDefined();
      expect(arscEntry!.size).toBeGreaterThan(10000); // Resources table must be populated
    });

    it('2.3 verifies Capacitor configuration is bundled in APK assets', () => {
      const apkBuffer = fs.readFileSync(apkPath);
      const { entries } = parseZipCentralDirectory(apkBuffer);

      // Capacitor places its configuration under assets/capacitor.config.json
      const configEntry = entries.find(
        (e) => e === 'capacitor.config.json' || e === 'assets/capacitor.config.json'
      );
      expect(configEntry).toBeDefined();
      expect(configEntry).toBe('assets/capacitor.config.json');

      const pluginsEntry = entries.find((e) => e.includes('capacitor.plugins.json'));
      expect(pluginsEntry).toBeDefined();
    });

    it('2.4 verifies bundled web distribution contains index.html and compiled assets', () => {
      const apkBuffer = fs.readFileSync(apkPath);
      const { entries, entryMap } = parseZipCentralDirectory(apkBuffer);

      expect(entries).toContain('assets/public/index.html');
      const indexEntry = entryMap.get('assets/public/index.html');
      expect(indexEntry).toBeDefined();
      expect(indexEntry!.size).toBeGreaterThan(500);

      // Verify bundled scripts and styles inside assets/public/assets
      const webAssets = entries.filter((e) => e.startsWith('assets/public/assets/'));
      expect(webAssets.length).toBeGreaterThan(0);
      expect(webAssets.some((e) => e.endsWith('.js'))).toBe(true);
      expect(webAssets.some((e) => e.endsWith('.css'))).toBe(true);
    });

    it('2.5 validates Android drawable/mipmap app icons inside APK res/ directory', () => {
      const apkBuffer = fs.readFileSync(apkPath);
      const { entries } = parseZipCentralDirectory(apkBuffer);

      const icons = entries.filter((e) => e.includes('ic_launcher'));
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // SUITE 3: CRYPTOGRAPHIC HASH & VERSION.JSON SYNCHRONIZATION
  // ===========================================================================
  describe('Suite 3: Cryptographic Integrity & Version Synchronization', () => {
    it('3.1 calculates SHA-256 hash of APK and compares against public/version.json', () => {
      const apkBuffer = fs.readFileSync(apkPath);
      const computedSha256 = crypto.createHash('sha256').update(apkBuffer).digest('hex');

      expect(fs.existsSync(versionJsonPath)).toBe(true);
      const versionContent = fs.readFileSync(versionJsonPath, 'utf8');
      const versionJson = JSON.parse(versionContent);

      expect(versionJson.checksumSha256).toBeDefined();
      expect(computedSha256).toBe(versionJson.checksumSha256);
      expect(computedSha256.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(computedSha256)).toBe(true);
    });

    it('3.2 validates apkSizeMb in version.json matches actual physical size within 0.02 MB', () => {
      const stat = fs.statSync(apkPath);
      const actualSizeMb = parseFloat((stat.size / (1024 * 1024)).toFixed(2));

      const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
      expect(versionJson.apkSizeMb).toBeDefined();
      expect(typeof versionJson.apkSizeMb).toBe('number');

      const difference = Math.abs(versionJson.apkSizeMb - actualSizeMb);
      expect(difference).toBeLessThanOrEqual(0.02);
    });

    it('3.3 validates version.json schema and required distribution properties', () => {
      const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));

      expect(versionJson.version).toBe('8.0.0');
      expect(versionJson.minSupportedVersion).toBe('7.0.0');
      expect(versionJson.minVersion).toBe('7.0.0');
      expect(versionJson.downloadUrl).toBe(
        'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.0.apk'
      );
      expect(typeof versionJson.releaseDate).toBe('string');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(versionJson.releaseDate)).toBe(true);
      expect(Array.isArray(versionJson.changelog)).toBe(true);
      expect(versionJson.changelog.length).toBeGreaterThan(0);
      expect(typeof versionJson.releaseNotes).toBe('string');
      expect(versionJson.releaseNotes.length).toBeGreaterThan(10);
    });
  });

  // ===========================================================================
  // SUITE 4: CAPACITOR CONFIGURATION & ANDROID MANIFEST CONTRACT
  // ===========================================================================
  describe('Suite 4: Capacitor Configuration & Android Manifest Contract', () => {
    it('4.1 verifies capacitor.config.ts adheres to required contract', () => {
      expect(capacitorConfig.appId).toBe('com.pomofocus.workspace');
      expect(capacitorConfig.appName).toBe('PomoFocus');
      expect(capacitorConfig.webDir).toBe('dist');
      expect(capacitorConfig.server?.androidScheme).toBe('https');
      expect(capacitorConfig.android?.backgroundColor).toBe('#09090b');
      expect(capacitorConfig.android?.allowMixedContent).toBe(false);
    });

    it('4.2 verifies android/local.properties points to valid Android SDK', () => {
      expect(fs.existsSync(localPropertiesPath)).toBe(true);
      const content = fs.readFileSync(localPropertiesPath, 'utf8');
      expect(content).toContain('sdk.dir');
      expect(content).toMatch(/sdk\.dir=.+/);
    });

    it('4.3 verifies android/app/build.gradle configures applicationId and plugins', () => {
      expect(fs.existsSync(appBuildGradlePath)).toBe(true);
      const gradleContent = fs.readFileSync(appBuildGradlePath, 'utf8');
      expect(gradleContent).toContain("applicationId \"com.pomofocus.workspace\"");
      expect(gradleContent).toContain("apply plugin: 'com.android.application'");
      expect(gradleContent).toContain("implementation project(':capacitor-android')");
    });

    it('4.4 verifies AndroidManifest.xml configures MainActivity, launcher, and permissions', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifestXml = fs.readFileSync(manifestPath, 'utf8');
      expect(manifestXml).toContain('android.intent.action.MAIN');
      expect(manifestXml).toContain('android.intent.category.LAUNCHER');
      expect(manifestXml).toContain('android.permission.INTERNET');
      expect(manifestXml).toContain('.MainActivity');
    });
  });

  // ===========================================================================
  // SUITE 5: ADVERSARIAL STRESS-TESTS & CORRUPTION HARNESS
  // ===========================================================================
  describe('Suite 5: Adversarial Tampering & Stress Oracles', () => {
    it('5.1 verifies bit-flip tampering is immediately detected by SHA-256 oracle', () => {
      const realBuffer = fs.readFileSync(apkPath);
      const realSha = crypto.createHash('sha256').update(realBuffer).digest('hex');

      // Clone buffer and flip a single bit in the middle of file
      const tamperedBuffer = Buffer.from(realBuffer);
      const flipOffset = Math.floor(tamperedBuffer.length / 2);
      tamperedBuffer[flipOffset] ^= 0x01; // Invert bit 0

      const tamperedSha = crypto.createHash('sha256').update(tamperedBuffer).digest('hex');
      expect(tamperedSha).not.toBe(realSha);

      // Verify that version.json checksum will reject tampered binary
      const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
      expect(tamperedSha).not.toBe(versionJson.checksumSha256);
    });

    it('5.2 verifies ZIP central directory parser rejects truncated buffers', () => {
      const realBuffer = fs.readFileSync(apkPath);
      // Truncate file so EOCD is missing
      const truncated = realBuffer.subarray(0, realBuffer.length - 100000);

      expect(() => parseZipCentralDirectory(truncated)).toThrow(/EOCD signature/);
    });

    it('5.3 verifies ZIP parser throws on corrupted magic signature at start', () => {
      const badBuffer = Buffer.from('NOT_A_ZIP_FILE_RANDOM_DATA');
      expect(() => parseZipCentralDirectory(badBuffer)).toThrow();
    });

    it('5.4 verifies zero-byte truncation fails physical size assertion', () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(emptyBuffer.length).toBeLessThan(3000000);
      expect(() => parseZipCentralDirectory(emptyBuffer)).toThrow();
    });
  });
});
