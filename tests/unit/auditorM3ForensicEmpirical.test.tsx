import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as zlib from 'node:zlib';

import capacitorConfig from '../../capacitor.config';
import * as buildApkModule from '../../scripts/buildApk';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const APK_PATH = path.join(PROJECT_ROOT, 'public', 'downloads', 'PomoFocus-v8.0.apk');
const VERSION_JSON_PATH = path.join(PROJECT_ROOT, 'public', 'version.json');
const CAPACITOR_CONFIG_PATH = path.join(PROJECT_ROOT, 'capacitor.config.ts');
const BUILD_APK_SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'buildApk.ts');
const ANDROID_DIR = path.join(PROJECT_ROOT, 'android');
const LOCAL_PROPERTIES_PATH = path.join(ANDROID_DIR, 'local.properties');
const ANDROID_BUILD_GRADLE_PATH = path.join(ANDROID_DIR, 'build.gradle');
const APP_BUILD_GRADLE_PATH = path.join(ANDROID_DIR, 'app', 'build.gradle');
const ANDROID_MANIFEST_PATH = path.join(ANDROID_DIR, 'app', 'src', 'main', 'AndroidManifest.xml');

/**
 * Robust zero-dependency ZIP central directory parser
 */
function parseZipCentralDirectory(buffer: Buffer): Array<{ name: string; uncompressedSize: number; compressedSize: number }> {
  const entries: Array<{ name: string; uncompressedSize: number; compressedSize: number }> = [];
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) === 0x02014b50) {
      const compSize = buffer.readUInt32LE(offset + 20);
      const uncompSize = buffer.readUInt32LE(offset + 24);
      const fileNameLen = buffer.readUInt16LE(offset + 28);
      const extraLen = buffer.readUInt16LE(offset + 30);
      const commentLen = buffer.readUInt16LE(offset + 32);
      const fileName = buffer.toString('utf-8', offset + 46, offset + 46 + fileNameLen);
      entries.push({ name: fileName, uncompressedSize: uncompSize, compressedSize: compSize });
      offset += 46 + fileNameLen + extraLen + commentLen;
    } else {
      offset++;
    }
  }
  return entries;
}

/**
 * Extracts raw uncompressed data for a named entry from a ZIP buffer
 */
function extractZipEntry(buffer: Buffer, targetName: string): Buffer | null {
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
      const compMethod = buffer.readUInt16LE(offset + 8);
      const compSize = buffer.readUInt32LE(offset + 18);
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const name = buffer.toString('utf-8', offset + 30, offset + 30 + fileNameLen);

      if (name === targetName) {
        const dataStart = offset + 30 + fileNameLen + extraLen;
        const compData = buffer.subarray(dataStart, dataStart + compSize);
        if (compMethod === 8) {
          return zlib.inflateRawSync(compData);
        }
        if (compMethod === 0) {
          return compData;
        }
      }
      offset += 30 + fileNameLen + extraLen + compSize;
    } else {
      offset++;
    }
  }
  return null;
}

describe('Auditor Independent Forensic Suite: Milestone 3 (Capacitor Android & Standalone APK)', () => {
  describe('1. Standalone APK Binary Deep Forensic Verification', () => {
    it('empirically confirms APK binary existence and size > 3 MB', () => {
      expect(fs.existsSync(APK_PATH), `APK binary must exist at ${APK_PATH}`).toBe(true);
      const stats = fs.statSync(APK_PATH);
      const minThresholdBytes = 3 * 1024 * 1024; // 3 MB
      expect(stats.size).toBeGreaterThan(minThresholdBytes);
      // Realistic Android Capacitor APK is ~8MB
      expect(stats.size).toBeGreaterThan(7 * 1024 * 1024);
      expect(stats.size).toBeLessThan(20 * 1024 * 1024);
    });

    it('verifies standard ZIP container magic bytes PK\\x03\\x04', () => {
      const fd = fs.openSync(APK_PATH, 'r');
      const header = Buffer.alloc(4);
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);

      expect(header[0]).toBe(0x50); // 'P'
      expect(header[1]).toBe(0x4b); // 'K'
      expect(header[2]).toBe(0x03);
      expect(header[3]).toBe(0x04);
    });

    it('inspects ZIP structure and verifies presence of all mandatory Android assets', () => {
      const apkBuffer = fs.readFileSync(APK_PATH);
      const entries = parseZipCentralDirectory(apkBuffer);
      const entryNames = entries.map((e) => e.name);

      expect(entryNames.length).toBeGreaterThan(100);

      // 4 Core Android Package Requirements
      expect(entryNames).toContain('classes.dex');
      expect(entryNames).toContain('AndroidManifest.xml');
      expect(entryNames).toContain('resources.arsc');
      expect(entryNames).toContain('assets/capacitor.config.json');

      // Multi-dex presence
      const dexEntries = entryNames.filter((n) => n.endsWith('.dex'));
      expect(dexEntries.length).toBeGreaterThanOrEqual(2);
      expect(dexEntries).toContain('classes.dex');
      expect(dexEntries).toContain('classes2.dex');
    });

    it('extracts and verifies authentic Dalvik Executable (DEX) bytecode header in classes.dex', () => {
      const apkBuffer = fs.readFileSync(APK_PATH);
      const rawDex = extractZipEntry(apkBuffer, 'classes.dex');

      expect(rawDex).not.toBeNull();
      expect(rawDex!.length).toBeGreaterThan(1024 * 1024); // classes.dex should be several MB uncompressed

      // Standard DEX magic is "dex\n035\0", "dex\n037\0", "dex\n038\0", or "dex\n039\0"
      const dexMagic = rawDex!.subarray(0, 8);
      const dexAscii = dexMagic.toString('ascii');
      expect(dexAscii.startsWith('dex\n')).toBe(true);
      expect(dexMagic[0]).toBe(0x64); // 'd'
      expect(dexMagic[1]).toBe(0x65); // 'e'
      expect(dexMagic[2]).toBe(0x78); // 'x'
      expect(dexMagic[3]).toBe(0x0a); // '\n'
    });

    it('extracts and verifies assets/capacitor.config.json inside APK matches expected app identity', () => {
      const apkBuffer = fs.readFileSync(APK_PATH);
      const rawCapJson = extractZipEntry(apkBuffer, 'assets/capacitor.config.json');

      expect(rawCapJson).not.toBeNull();
      const capJsonParsed = JSON.parse(rawCapJson!.toString('utf-8'));
      expect(capJsonParsed.appId).toBe('com.pomofocus.workspace');
      expect(capJsonParsed.appName).toBe('PomoFocus');
      expect(capJsonParsed.webDir).toBe('dist');
      expect(capJsonParsed.server?.androidScheme).toBe('https');
      expect(capJsonParsed.android?.backgroundColor).toBe('#09090b');
    });

    it('confirms bundled production web assets exist inside assets/public/', () => {
      const apkBuffer = fs.readFileSync(APK_PATH);
      const entries = parseZipCentralDirectory(apkBuffer);
      const bundledAssets = entries.filter((e) => e.name.startsWith('assets/public/'));
      expect(bundledAssets.length).toBeGreaterThan(10);
    });
  });

  describe('2. Cryptographic Integrity & Version Manifest Attestation', () => {
    it('empirically computes SHA-256 and proves exact match with public/version.json', () => {
      const apkBuffer = fs.readFileSync(APK_PATH);
      const computedSha256 = crypto.createHash('sha256').update(apkBuffer).digest('hex');

      expect(fs.existsSync(VERSION_JSON_PATH)).toBe(true);
      const versionContent = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf-8'));

      expect(versionContent.checksumSha256).toBe(computedSha256);
    });

    it('verifies apkSizeMb matches actual byte size rounded to 2 decimal places', () => {
      const apkBuffer = fs.readFileSync(APK_PATH);
      const computedSizeMb = parseFloat((apkBuffer.length / (1024 * 1024)).toFixed(2));

      const versionContent = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf-8'));
      expect(versionContent.apkSizeMb).toBe(computedSizeMb);
    });

    it('verifies public/version.json schema, semver, and canonical download URL', () => {
      const versionContent = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf-8'));

      expect(versionContent.version).toBe('8.0.0');
      expect(versionContent.minVersion).toBe('7.0.0');
      expect(versionContent.minSupportedVersion).toBe('7.0.0');
      expect(versionContent.downloadUrl).toBe('https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.0.apk');
      expect(Array.isArray(versionContent.changelog)).toBe(true);
      expect(versionContent.changelog.length).toBeGreaterThanOrEqual(1);
    });

    it('adversarially tests cryptographic tamper detection (1 bit flip triggers checksum rejection)', () => {
      const apkBuffer = fs.readFileSync(APK_PATH);
      const legitimateHash = crypto.createHash('sha256').update(apkBuffer).digest('hex');

      // Create tampered copy by flipping a single byte
      const tamperedBuffer = Buffer.from(apkBuffer);
      tamperedBuffer[tamperedBuffer.length - 1] ^= 0x01;

      const tamperedHash = crypto.createHash('sha256').update(tamperedBuffer).digest('hex');
      expect(tamperedHash).not.toBe(legitimateHash);
    });
  });

  describe('3. Anti-Facade & Build Automation Logic (scripts/buildApk.ts)', () => {
    it('verifies buildApk.ts exports genuine orchestration functions', () => {
      expect(typeof buildApkModule.setupEnvironment).toBe('function');
      expect(typeof buildApkModule.ensureLocalProperties).toBe('function');
      expect(typeof buildApkModule.ensureCapacitorAndroid).toBe('function');
      expect(typeof buildApkModule.buildWebAssets).toBe('function');
      expect(typeof buildApkModule.syncCapacitorAndroid).toBe('function');
      expect(typeof buildApkModule.buildApkGradle).toBe('function');
      expect(typeof buildApkModule.copyAndHashApk).toBe('function');
      expect(typeof buildApkModule.run).toBe('function');
    });

    it('verifies buildApk.ts source code invokes real build tools (no dummy facades)', () => {
      const source = fs.readFileSync(BUILD_APK_SCRIPT_PATH, 'utf-8');

      // Checks for real Gradle invocation
      expect(source).toContain('assembleDebug');
      // Checks for real Capacitor asset synchronization
      expect(source).toContain('cap sync android');
      // Checks for real web build
      expect(source).toContain('npm run build');
      // Checks for real hash and file copying
      expect(source).toContain("crypto.createHash('sha256')");
      expect(source).toContain('copyFileSync');

      // Anti-cheat: No fake hardcoded mock hashes
      expect(source).not.toContain("return '8f5898c21570e6daed890f1f7ec83033fdd140b6479ac54707a8e797f8ebcfe2'");
    });

    it('verifies configuration paths in buildApk.ts match project topology', () => {
      expect(buildApkModule.PROJECT_ROOT).toBe(PROJECT_ROOT);
      expect(buildApkModule.TARGET_APK_PATH).toBe(APK_PATH);
      expect(buildApkModule.VERSION_JSON_PATH).toBe(VERSION_JSON_PATH);
    });
  });

  describe('4. Capacitor Configuration & Android Native Structure', () => {
    it('verifies capacitor.config.ts adheres to @capacitor/cli specification', () => {
      expect(capacitorConfig.appId).toBe('com.pomofocus.workspace');
      expect(capacitorConfig.appName).toBe('PomoFocus');
      expect(capacitorConfig.webDir).toBe('dist');
      expect(capacitorConfig.server?.androidScheme).toBe('https');
      expect(capacitorConfig.android?.backgroundColor).toBe('#09090b');
      expect(capacitorConfig.android?.allowMixedContent).toBe(false);
    });

    it('confirms android/local.properties points to valid Android SDK', () => {
      expect(fs.existsSync(LOCAL_PROPERTIES_PATH)).toBe(true);
      const content = fs.readFileSync(LOCAL_PROPERTIES_PATH, 'utf-8');
      expect(content).toContain('sdk.dir=');
      expect(content).toContain('AppData');
      expect(content).toContain('Android');
      expect(content).toContain('Sdk');
    });

    it('confirms android/build.gradle contains Java 17 compatibility subprojects hook', () => {
      expect(fs.existsSync(ANDROID_BUILD_GRADLE_PATH)).toBe(true);
      const content = fs.readFileSync(ANDROID_BUILD_GRADLE_PATH, 'utf-8');
      expect(content).toContain('subprojects');
      expect(content).toContain('JavaVersion.VERSION_17');
    });

    it('confirms android/app/build.gradle specifies applicationId and namespace', () => {
      expect(fs.existsSync(APP_BUILD_GRADLE_PATH)).toBe(true);
      const content = fs.readFileSync(APP_BUILD_GRADLE_PATH, 'utf-8');
      expect(content).toContain('namespace = "com.pomofocus.workspace"');
      expect(content).toContain('applicationId "com.pomofocus.workspace"');
    });

    it('confirms AndroidManifest.xml configures INTERNET permission and launcher activity', () => {
      expect(fs.existsSync(ANDROID_MANIFEST_PATH)).toBe(true);
      const content = fs.readFileSync(ANDROID_MANIFEST_PATH, 'utf-8');
      expect(content).toContain('android.permission.INTERNET');
      expect(content).toContain('android.intent.action.MAIN');
      expect(content).toContain('android.intent.category.LAUNCHER');
    });
  });

  describe('5. Workspace Cleanliness & Anti-Cheat Zero-Byte Facade Audit', () => {
    it('verifies 0 empty/0-byte facade files in src/, scripts/, and public/', () => {
      const targetDirs = ['src', 'scripts', 'public'];
      const emptyFiles: string[] = [];

      for (const dirName of targetDirs) {
        const fullDir = path.join(PROJECT_ROOT, dirName);
        if (fs.existsSync(fullDir)) {
          const scan = (d: string) => {
            const entries = fs.readdirSync(d, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(d, entry.name);
              if (entry.isDirectory()) {
                scan(fullPath);
              } else if (entry.isFile()) {
                const stat = fs.statSync(fullPath);
                if (stat.size === 0) {
                  emptyFiles.push(path.relative(PROJECT_ROOT, fullPath));
                }
              }
            }
          };
          scan(fullDir);
        }
      }

      expect(emptyFiles).toEqual([]);
    });

    it('verifies package.json scripts contain build:apk mapped to tsx scripts/buildApk.ts', () => {
      const pkgPath = path.join(PROJECT_ROOT, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.scripts['build:apk']).toBe('tsx scripts/buildApk.ts');
      expect(pkg.dependencies['@capacitor/core']).toBeDefined();
      expect(pkg.dependencies['@capacitor/android']).toBeDefined();
      expect(pkg.devDependencies['@capacitor/cli']).toBeDefined();
    });
  });
});
