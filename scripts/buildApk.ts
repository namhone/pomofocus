import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration constants
export const JAVA_HOME = 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.19.10-hotspot';
export const ANDROID_HOME = 'C:\\Users\\Nam\\AppData\\Local\\Android\\Sdk';
export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const ANDROID_DIR = path.join(PROJECT_ROOT, 'android');
export const LOCAL_PROPERTIES_PATH = path.join(ANDROID_DIR, 'local.properties');
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
export const DOWNLOADS_DIR = path.join(PUBLIC_DIR, 'downloads');
export const APP_VERSION = '8.1.0';
export const APK_FILENAME = 'PomoFocus-v8.1.apk';
export const TARGET_APK_PATH = path.join(DOWNLOADS_DIR, APK_FILENAME);
export const VERSION_JSON_PATH = path.join(PUBLIC_DIR, 'version.json');
export const GRADLE_OUTPUT_APK = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

export function setupEnvironment() {
  process.env.JAVA_HOME = JAVA_HOME;
  process.env.ANDROID_HOME = ANDROID_HOME;
  process.env.PATH = `${path.join(JAVA_HOME, 'bin')};${path.join(ANDROID_HOME, 'platform-tools')};${process.env.PATH || ''}`;
}

export function ensureLocalProperties() {
  if (!fs.existsSync(ANDROID_DIR)) {
    return;
  }
  const expectedContent = `## Generated local.properties\nsdk.dir=C:\\\\Users\\\\Nam\\\\AppData\\\\Local\\\\Android\\\\Sdk\n`;
  if (!fs.existsSync(LOCAL_PROPERTIES_PATH)) {
    fs.writeFileSync(LOCAL_PROPERTIES_PATH, expectedContent, 'utf-8');
    console.log('[buildApk] Created android/local.properties');
  } else {
    const existing = fs.readFileSync(LOCAL_PROPERTIES_PATH, 'utf-8');
    if (!existing.includes('sdk.dir')) {
      fs.appendFileSync(LOCAL_PROPERTIES_PATH, `\nsdk.dir=C:\\\\Users\\\\Nam\\\\AppData\\\\Local\\\\Android\\\\Sdk\n`, 'utf-8');
      console.log('[buildApk] Appended sdk.dir to android/local.properties');
    }
  }
}

export function ensureCapacitorAndroid() {
  if (!fs.existsSync(ANDROID_DIR)) {
    console.log('[buildApk] android/ directory not found. Running npx cap add android...');
    execSync('npx cap add android', { cwd: PROJECT_ROOT, stdio: 'inherit', env: process.env });
  }
  ensureLocalProperties();
}

export function buildWebAssets() {
  console.log('[buildApk] Building web application assets (npm run build)...');
  execSync('npm run build', { cwd: PROJECT_ROOT, stdio: 'inherit', env: process.env });
}

export function syncCapacitorAndroid() {
  // Prevent recursive APK-inside-APK bloat: remove dist/downloads before syncing web assets into Android
  const distDownloadsDir = path.join(PROJECT_ROOT, 'dist', 'downloads');
  if (fs.existsSync(distDownloadsDir)) {
    fs.rmSync(distDownloadsDir, { recursive: true, force: true });
    console.log('[buildApk] Excluded dist/downloads from Capacitor Android bundle to avoid recursive APK bloat.');
  }
  console.log('[buildApk] Syncing assets with Capacitor Android (npx cap sync android)...');
  execSync('npx cap sync android', { cwd: PROJECT_ROOT, stdio: 'inherit', env: process.env });
}

export function buildApkGradle() {
  console.log('[buildApk] Compiling debug APK via Gradle Wrapper (gradlew.bat assembleDebug)...');
  const isWindows = process.platform === 'win32';
  const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';
  execSync(`${gradlewCmd} assembleDebug`, {
    cwd: ANDROID_DIR,
    stdio: 'inherit',
    env: process.env
  });
}

export function copyAndHashApk() {
  if (!fs.existsSync(GRADLE_OUTPUT_APK)) {
    throw new Error(`[buildApk] Expected APK not found at: ${GRADLE_OUTPUT_APK}`);
  }

  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }

  // Copy output to public/downloads/PomoFocus-v8.0.apk
  fs.copyFileSync(GRADLE_OUTPUT_APK, TARGET_APK_PATH);
  console.log(`[buildApk] Copied APK to: ${TARGET_APK_PATH}`);

  // Calculate file size and SHA-256 hash
  const fileBuffer = fs.readFileSync(TARGET_APK_PATH);
  const fileSizeBytes = fileBuffer.length;
  const sizeMb = parseFloat((fileSizeBytes / (1024 * 1024)).toFixed(2));
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  console.log(`[buildApk] APK Size: ${sizeMb} MB (${fileSizeBytes} bytes)`);
  console.log(`[buildApk] SHA-256: ${sha256}`);

  // Update public/version.json
  let versionData: Record<string, unknown> = {};
  if (fs.existsSync(VERSION_JSON_PATH)) {
    try {
      versionData = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf-8'));
    } catch {
      versionData = {};
    }
  }

  versionData.version = APP_VERSION;
  versionData.versionCode = 81;
  versionData.minSupportedVersion = versionData.minSupportedVersion || '7.0.0';
  versionData.minVersion = versionData.minVersion || '7.0.0';
  versionData.releaseDate = new Date().toISOString().split('T')[0];
  versionData.downloadUrl = `https://pomofocus-workspace.vercel.app/downloads/${APK_FILENAME}`;
  versionData.apkSizeMb = sizeMb;
  versionData.checksumSha256 = sha256;
  versionData.releaseNotes =
    'PomoFocus v8.1 Ultimate: Meet Web Rooms, Shared Whiteboard, Dexie v2 Offline Queue, Pocket Lock & Hold to Start.';
  versionData.changelog = [
    'Phòng học nhóm PomoFocus Meet (/rooms) với đồng bộ đồng hồ thời gian thực',
    'Bảng trắng nhóm (Shared Whiteboard) lưu vết nét vẽ bền vững',
    'Khóa chạm bỏ túi (Pocket Lock) và cử chỉ giữ 800ms để bắt đầu học sâu',
  ];

  fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(versionData, null, 2) + '\n', 'utf-8');
  console.log('[buildApk] Updated public/version.json successfully.');

  return { sizeMb, sha256, targetPath: TARGET_APK_PATH };
}

export async function run() {
  console.log('=== PomoFocus v8.0: Android APK Build Pipeline ===');
  setupEnvironment();
  ensureCapacitorAndroid();
  buildWebAssets();
  syncCapacitorAndroid();
  buildApkGradle();
  const result = copyAndHashApk();
  // Sync final APK and version.json back into dist/ so production web deployments serve the latest binary
  const distDir = path.join(PROJECT_ROOT, 'dist');
  const distDownloadsDir = path.join(distDir, 'downloads');
  if (fs.existsSync(distDir)) {
    fs.mkdirSync(distDownloadsDir, { recursive: true });
    fs.copyFileSync(TARGET_APK_PATH, path.join(distDownloadsDir, APK_FILENAME));
    if (fs.existsSync(VERSION_JSON_PATH)) {
      fs.copyFileSync(VERSION_JSON_PATH, path.join(distDir, 'version.json'));
    }
    console.log('[buildApk] Synchronized final APK and version.json into dist/ for web distribution.');
  }
  console.log('=== Build Succeeded! ===');
  console.log(result);
  return result;
}

// Auto-run if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  run().catch((err) => {
    console.error('[buildApk] Fatal Error:', err);
    process.exit(1);
  });
}
