#!/usr/bin/env node
/**
 * Local release APK (JS bundle embedded, installable on any Android device).
 *
 * Prerequisites (install once on your PC):
 *   - JDK 17+ — JAVA_HOME optional on Windows: we try Android Studio's JBR and Eclipse Adoptium paths
 *   - Android SDK — ANDROID_HOME optional on Windows: we try %LOCALAPPDATA%\\Android\\Sdk
 *
 * First run: creates android/ via `expo prebuild` (Expo may tweak package.json scripts — restore from git if you prefer).
 * Next runs: skips prebuild unless you set FORCE_PREBUILD=1 (Windows: set FORCE_PREBUILD=1&& npm run android:local:apk)
 *
 * Output: dist/Zeeventory-<version>.apk
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);

const isWin = process.platform === 'win32';
const androidDir = path.join(root, 'android');
const forcePrebuild =
  process.env.FORCE_PREBUILD === '1' ||
  process.env.PREBUILD === '1' ||
  process.env.FORCE_PREBUILD === 'true';

/** Expo prebuild rewrites android/ios scripts — put back the ones we want in this repo. */
function restorePackageScripts() {
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts = pkg.scripts || {};
  const desired = {
    start: 'expo start',
    android: 'expo start --android',
    'android:run': 'expo run:android',
    ios: 'expo start --ios',
    'ios:run': 'expo run:ios',
    web: 'expo start --web',
    'android:local:apk': 'node scripts/build-local-apk.js',
    'build:apk': 'eas build --platform android --profile preview',
    'build:android:bundle': 'eas build --platform android --profile production',
  };
  let changed = false;
  for (const [key, val] of Object.entries(desired)) {
    if (pkg.scripts[key] !== val) {
      pkg.scripts[key] = val;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log('\n==> Restored package.json npm scripts after prebuild\n');
  }
}

function run(cmd, opts = {}) {
  execSync(cmd, {
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
    ...opts,
  });
}

function javaBin(javaHome) {
  return path.join(javaHome, 'bin', isWin ? 'java.exe' : 'java');
}

/** Windows: find a JDK when JAVA_HOME / PATH are not set (common with Android Studio only). */
function findJavaHomeWindows() {
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const la = process.env.LOCALAPPDATA || '';
  const tryHomes = [
    path.join(pf, 'Android', 'Android Studio', 'jbr'),
    path.join(pfx86, 'Android', 'android-studio', 'jbr'),
    path.join(pf, 'JetBrains', 'AndroidStudio', 'jbr'),
  ];
  const adoptium = path.join(la, 'Programs', 'Eclipse Adoptium');
  if (fs.existsSync(adoptium)) {
    try {
      fs.readdirSync(adoptium, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^jdk-?/i.test(d.name))
        .sort((a, b) => b.name.localeCompare(a.name))
        .forEach((d) => tryHomes.push(path.join(adoptium, d.name)));
    } catch {
      /* */
    }
  }
  for (const home of tryHomes) {
    if (fs.existsSync(javaBin(home))) return path.resolve(home);
  }
  return null;
}

function ensureJava() {
  const envHome = process.env.JAVA_HOME;
  if (envHome && fs.existsSync(javaBin(envHome))) {
    process.env.JAVA_HOME = path.resolve(envHome);
    return;
  }
  try {
    execSync('java -version', { stdio: 'pipe', shell: isWin });
    return;
  } catch {
    /* */
  }
  if (isWin) {
    const found = findJavaHomeWindows();
    if (found) {
      process.env.JAVA_HOME = found;
      const sep = path.delimiter;
      process.env.PATH = `${path.join(found, 'bin')}${sep}${process.env.PATH || ''}`;
      console.log(`Using JAVA_HOME (auto-detected): ${found}\n`);
      return;
    }
  }
  console.error(`
Missing Java (JDK). Do one of the following:
  1) Install Android Studio (includes a JDK under ...\\Android Studio\\jbr), then run this script again.
  2) Install JDK 17+ from https://adoptium.net and set JAVA_HOME to the JDK folder
     Example PowerShell (session only):
       $env:JAVA_HOME="C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.13.11-hotspot"
  3) Or add "java" to your system PATH
`);
  process.exit(1);
}

function ensureAndroidSdk() {
  let sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (sdk && fs.existsSync(sdk)) {
    process.env.ANDROID_HOME = path.resolve(sdk);
    return;
  }
  if (isWin && process.env.LOCALAPPDATA) {
    const guess = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk');
    if (fs.existsSync(guess)) {
      process.env.ANDROID_HOME = guess;
      console.log(`Using ANDROID_HOME (auto-detected): ${guess}\n`);
      return;
    }
  }
  console.error(`
Missing Android SDK. Install Android Studio and open SDK Manager once, or set:
  ANDROID_HOME
Example PowerShell:
  $env:ANDROID_HOME="$env:LOCALAPPDATA\\Android\\Sdk"
`);
  process.exit(1);
}

function checkPrereqs() {
  ensureJava();
  ensureAndroidSdk();
}

checkPrereqs();

if (forcePrebuild || !fs.existsSync(androidDir)) {
  console.log('\n==> expo prebuild (android)\n');
  run(`npx expo prebuild --platform android --no-install`);
  restorePackageScripts();
} else {
  console.log(
    '\n==> Skipping expo prebuild (android/ already exists). Set FORCE_PREBUILD=1 to regenerate native files.\n'
  );
}

const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');
if (!fs.existsSync(gradlew)) {
  console.error('Expected Gradle wrapper at:', gradlew);
  process.exit(1);
}

console.log('\n==> Gradle assembleRelease (bundled JS; Expo template signs release with debug keystore — OK for sideloading)\n');
if (isWin) {
  run('.\\gradlew.bat assembleRelease', { cwd: androidDir });
} else {
  try {
    fs.chmodSync(path.join(androidDir, 'gradlew'), 0o755);
  } catch (_) {
    /* ignore */
  }
  run('./gradlew assembleRelease', { cwd: androidDir });
}

const apkSrc = path.join(
  androidDir,
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk'
);
if (!fs.existsSync(apkSrc)) {
  console.error('APK not found at:', apkSrc);
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const version = appJson.expo?.version || '1.0.0';
const distDir = path.join(root, 'dist');
fs.mkdirSync(distDir, { recursive: true });
const outApk = path.join(distDir, `Zeeventory-${version}.apk`);
fs.copyFileSync(apkSrc, outApk);

console.log('\n==> Done\n');
console.log('Installable APK:', outApk);
console.log('\nShare that file (USB, Drive, etc.). On the phone, allow installs from that source if Android asks.\n');
