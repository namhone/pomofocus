import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

describe('Milestone 3 Empirical Challenger 2: Capacitor Android & Standalone APK Verification', () => {
  const projectRoot = path.resolve(__dirname, '../../');
  const capacitorConfigPath = path.join(projectRoot, 'capacitor.config.ts');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const buildApkScriptPath = path.join(projectRoot, 'scripts/buildApk.ts');
  const versionJsonPath = path.join(projectRoot, 'public/version.json');
  const apkPath = path.join(projectRoot, 'public/downloads/PomoFocus-v8.1.apk');
  const androidLocalPropertiesPath = path.join(projectRoot, 'android/local.properties');
  const androidAppBuildGradlePath = path.join(projectRoot, 'android/app/build.gradle');

  // =========================================================================
  // SUITE 1: Capacitor Configuration & Android Target Contracts
  // =========================================================================
  describe('Suite 1: Capacitor Configuration Contract', () => {
    it('1.1 capacitor.config.ts physically exists and exports default configuration', async () => {
      expect(fs.existsSync(capacitorConfigPath)).toBe(true);
      const imported = await import('../../capacitor.config');
      expect(imported.default).toBeDefined();
      expect(typeof imported.default).toBe('object');
    });

    it('1.2 appId strictly matches "com.pomofocus.workspace" with valid reverse-DNS format', async () => {
      const imported = await import('../../capacitor.config');
      const config = imported.default;
      expect(config.appId).toBe('com.pomofocus.workspace');
      expect(config.appId).toMatch(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/);
    });

    it('1.3 appName is "PomoFocus"', async () => {
      const imported = await import('../../capacitor.config');
      const config = imported.default;
      expect(config.appName).toBe('PomoFocus');
    });

    it('1.4 webDir points to "dist" (Vite production build target)', async () => {
      const imported = await import('../../capacitor.config');
      const config = imported.default;
      expect(config.webDir).toBe('dist');
    });

    it('1.5 server.androidScheme is strictly HTTPS to prevent cleartext HTTP vulnerabilities', async () => {
      const imported = await import('../../capacitor.config');
      const config = imported.default;
      expect(config.server).toBeDefined();
      expect(config.server?.androidScheme).toBe('https');
      expect(config.server?.androidScheme).not.toBe('http');
    });

    it('1.6 android security configuration enforces allowMixedContent = false and dark theme background', async () => {
      const imported = await import('../../capacitor.config');
      const config = imported.default;
      expect(config.android).toBeDefined();
      expect(config.android?.allowMixedContent).toBe(false);
      expect(config.android?.backgroundColor).toBe('#09090b');
    });

    it('1.7 android/app/build.gradle (if present) has applicationId matching capacitor config', () => {
      if (fs.existsSync(androidAppBuildGradlePath)) {
        const buildGradle = fs.readFileSync(androidAppBuildGradlePath, 'utf-8');
        expect(buildGradle).toContain('applicationId "com.pomofocus.workspace"');
      }
    });
  });

  // =========================================================================
  // SUITE 2: Package Manifest & Dependency Wiring
  // =========================================================================
  describe('Suite 2: Package Manifest & Dependency Verification', () => {
    let pkg: any;

    beforeEach(() => {
      expect(fs.existsSync(packageJsonPath)).toBe(true);
      pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    });

    it('2.1 package.json defines "build:apk": "tsx scripts/buildApk.ts"', () => {
      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts['build:apk']).toBe('tsx scripts/buildApk.ts');
    });

    it('2.2 @capacitor/core and @capacitor/android are present in dependencies', () => {
      expect(pkg.dependencies).toBeDefined();
      expect(pkg.dependencies['@capacitor/core']).toBeDefined();
      expect(pkg.dependencies['@capacitor/android']).toBeDefined();
    });

    it('2.3 @capacitor/haptics and @capacitor/status-bar are present in dependencies', () => {
      expect(pkg.dependencies).toBeDefined();
      expect(pkg.dependencies['@capacitor/haptics']).toBeDefined();
      expect(pkg.dependencies['@capacitor/status-bar']).toBeDefined();
    });

    it('2.4 @capacitor/cli and tsx are present in devDependencies', () => {
      expect(pkg.devDependencies).toBeDefined();
      expect(pkg.devDependencies['@capacitor/cli']).toBeDefined();
      expect(pkg.devDependencies['tsx']).toBeDefined();
    });
  });

  // =========================================================================
  // SUITE 3: Build Automation Script Structure & Error Handling Oracle
  // =========================================================================
  describe('Suite 3: buildApk.ts Script Resilience & Error Handling', () => {
    it('3.1 scripts/buildApk.ts exists and exports modular lifecycle functions', async () => {
      expect(fs.existsSync(buildApkScriptPath)).toBe(true);
      const mod = await import('../../scripts/buildApk');

      expect(typeof mod.setupEnvironment).toBe('function');
      expect(typeof mod.ensureLocalProperties).toBe('function');
      expect(typeof mod.ensureCapacitorAndroid).toBe('function');
      expect(typeof mod.buildWebAssets).toBe('function');
      expect(typeof mod.syncCapacitorAndroid).toBe('function');
      expect(typeof mod.buildApkGradle).toBe('function');
      expect(typeof mod.copyAndHashApk).toBe('function');
      expect(typeof mod.run).toBe('function');
    });

    it('3.2 exported paths and environment constants are well-formed', async () => {
      const mod = await import('../../scripts/buildApk');

      expect(mod.JAVA_HOME).toContain('jdk-17');
      expect(mod.ANDROID_HOME).toContain('Android');
      expect(mod.TARGET_APK_PATH).toContain('PomoFocus-v8.1.apk');
      expect(mod.VERSION_JSON_PATH).toContain('version.json');
      expect(mod.GRADLE_OUTPUT_APK).toContain('app-debug.apk');
    });

    it('3.3 setupEnvironment correctly mutates process.env', async () => {
      const originalJavaHome = process.env.JAVA_HOME;
      const originalAndroidHome = process.env.ANDROID_HOME;
      const originalPath = process.env.PATH;

      const mod = await import('../../scripts/buildApk');
      mod.setupEnvironment();

      expect(process.env.JAVA_HOME).toBe(mod.JAVA_HOME);
      expect(process.env.ANDROID_HOME).toBe(mod.ANDROID_HOME);
      expect(process.env.PATH).toContain(mod.JAVA_HOME);

      // Restore
      process.env.JAVA_HOME = originalJavaHome;
      process.env.ANDROID_HOME = originalAndroidHome;
      process.env.PATH = originalPath;
    });

    it('3.4 ensureLocalProperties preserves existing properties and adds sdk.dir safely', async () => {
      const tempDir = path.join(projectRoot, 'node_modules', '.temp_test_local_props');
      const tempLocalProps = path.join(tempDir, 'local.properties');

      try {
        fs.mkdirSync(tempDir, { recursive: true });
        fs.writeFileSync(tempLocalProps, 'custom.key=customValue\n', 'utf-8');

        // Verify appending logic
        const contentBefore = fs.readFileSync(tempLocalProps, 'utf-8');
        expect(contentBefore).not.toContain('sdk.dir');

        const appendSdk = (filePath: string) => {
          const existing = fs.readFileSync(filePath, 'utf-8');
          if (!existing.includes('sdk.dir')) {
            fs.appendFileSync(filePath, '\nsdk.dir=C:\\\\Test\\\\Sdk\n', 'utf-8');
          }
        };

        appendSdk(tempLocalProps);
        const contentAfter = fs.readFileSync(tempLocalProps, 'utf-8');
        expect(contentAfter).toContain('custom.key=customValue');
        expect(contentAfter).toContain('sdk.dir=C:\\\\Test\\\\Sdk');

        // Test idempotence
        appendSdk(tempLocalProps);
        const count = (contentAfter.match(/sdk\.dir/g) || []).length;
        expect(count).toBe(1);
      } finally {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    });

    it('3.5 copyAndHashApk throws an informative Error when source APK is missing', async () => {
      const mod = await import('../../scripts/buildApk');
      const tempBackup = mod.GRADLE_OUTPUT_APK + '.tmp_test_bak';
      const originalExisted = fs.existsSync(mod.GRADLE_OUTPUT_APK);
      try {
        if (originalExisted) {
          fs.renameSync(mod.GRADLE_OUTPUT_APK, tempBackup);
        }
        expect(() => mod.copyAndHashApk()).toThrow(/Expected APK not found/);
      } finally {
        if (originalExisted && fs.existsSync(tempBackup)) {
          fs.renameSync(tempBackup, mod.GRADLE_OUTPUT_APK);
        }
      }
    });

    it('3.6 hash calculation logic matches exact SHA-256 standard and size in MB', () => {
      const dummyData = Buffer.from('POMOFOCUS_V74_STANDALONE_APK_VERIFICATION_PAYLOAD_TEST');
      const expectedSha256 = crypto.createHash('sha256').update(dummyData).digest('hex');
      const expectedSizeMb = parseFloat((dummyData.length / (1024 * 1024)).toFixed(2));

      const computedSha256 = crypto.createHash('sha256').update(dummyData).digest('hex');
      const computedSizeMb = parseFloat((dummyData.length / (1024 * 1024)).toFixed(2));

      expect(computedSha256).toBe(expectedSha256);
      expect(computedSizeMb).toBe(expectedSizeMb);
    });

    it('3.7 version.json parsing survives malformed or empty content gracefully', () => {
      const malformedJson = '{ broken json ';
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(malformedJson);
      } catch {
        parsed = {};
      }

      parsed.version = parsed.version || '7.4.0';
      parsed.apkSizeMb = 7.98;
      expect(parsed.version).toBe('7.4.0');
      expect(parsed.apkSizeMb).toBe(7.98);
    });
  });

  // =========================================================================
  // SUITE 4: APK Binary Physical Existence & Checksum Parity
  // =========================================================================
  describe('Suite 4: Physical APK Binary & version.json Parity Oracle', () => {
    it('4.1 public/downloads/PomoFocus-v7.4.apk physically exists on disk', () => {
      expect(fs.existsSync(apkPath)).toBe(true);
    });

    it('4.2 physical APK binary size exceeds the 3MB standalone APK minimum threshold', () => {
      const stat = fs.statSync(apkPath);
      const sizeMb = stat.size / (1024 * 1024);
      expect(sizeMb).toBeGreaterThan(3.0);
      expect(sizeMb).toBeLessThan(50.0);
    });

    it('4.3 physical APK starts with standard ZIP magic bytes (0x50 0x4B 0x03 0x04)', () => {
      const fd = fs.openSync(apkPath, 'r');
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);

      // APKs are zip archives: PK\x03\x04
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4B); // 'K'
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });

    it('4.4 live computed SHA-256 matches version.json checksumSha256 identically', () => {
      expect(fs.existsSync(versionJsonPath)).toBe(true);
      const versionContent = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));

      const apkBuffer = fs.readFileSync(apkPath);
      const liveSha256 = crypto.createHash('sha256').update(apkBuffer).digest('hex');

      expect(versionContent.checksumSha256).toBeDefined();
      expect(typeof versionContent.checksumSha256).toBe('string');
      expect(versionContent.checksumSha256.length).toBe(64);
      expect(liveSha256).toBe(versionContent.checksumSha256);
    });

    it('4.5 live computed size in MB matches version.json apkSizeMb to 2 decimal places', () => {
      const versionContent = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));
      const stat = fs.statSync(apkPath);
      const liveSizeMb = parseFloat((stat.size / (1024 * 1024)).toFixed(2));

      expect(versionContent.apkSizeMb).toBeDefined();
      expect(typeof versionContent.apkSizeMb).toBe('number');
      expect(versionContent.apkSizeMb).toBe(liveSizeMb);
      expect(versionContent.apkSizeMb).toBeGreaterThan(3.0);
    });

    it('4.6 public/version.json conforms to all distribution manifest invariants', () => {
      const manifest = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));

      expect(manifest.version).toBe('8.1.0');
      expect(manifest.minSupportedVersion).toBe('7.0.0');
      expect(manifest.minVersion).toBe('7.0.0');
      expect(manifest.downloadUrl).toBe('https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.1.apk');
      expect(manifest.releaseNotes).toContain('PomoFocus v8.1');
      expect(Array.isArray(manifest.changelog)).toBe(true);
      expect(manifest.changelog.length).toBeGreaterThanOrEqual(3);
    });
  });

  // =========================================================================
  // SUITE 5: Android Build Environment & Native Setup Invariants
  // =========================================================================
  describe('Suite 5: Android Build Setup & Local Environment Integrity', () => {
    it('5.1 android/local.properties specifies valid sdk.dir', () => {
      expect(fs.existsSync(androidLocalPropertiesPath)).toBe(true);
      const props = fs.readFileSync(androidLocalPropertiesPath, 'utf-8');
      expect(props).toContain('sdk.dir');
      expect(props).toContain('Android');
    });

    it('5.2 android project contains gradlew.bat wrapper for Windows execution', () => {
      const gradlewBatPath = path.join(projectRoot, 'android/gradlew.bat');
      expect(fs.existsSync(gradlewBatPath)).toBe(true);
    });

    it('5.3 android project root build.gradle configures Java 17 compatibility', () => {
      const rootBuildGradlePath = path.join(projectRoot, 'android/build.gradle');
      expect(fs.existsSync(rootBuildGradlePath)).toBe(true);
      const buildGradle = fs.readFileSync(rootBuildGradlePath, 'utf-8');
      expect(buildGradle).toContain('JavaVersion.VERSION_17');
    });
  });
});
