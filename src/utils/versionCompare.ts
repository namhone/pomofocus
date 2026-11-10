/**
 * Semantic version comparison utility.
 * Handles 'v' prefixes, prerelease suffixes (-alpha, -beta, -rc), and standard major.minor.patch levels.
 *
 * @param v1 First version string
 * @param v2 Second version string
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').trim().replace(/^v/i, '').split('-')[0];
  const clean2 = (v2 || '').trim().replace(/^v/i, '').split('-')[0];

  const p1 = clean1.split('.').map((x) => parseInt(x, 10) || 0);
  const p2 = clean2.split('.').map((x) => parseInt(x, 10) || 0);

  const maxLen = Math.max(p1.length, p2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Checks if a remote version is strictly newer than the current client version.
 *
 * @param currentVersion Installed/local app version (e.g. '7.4.0')
 * @param remoteVersion Remote published version (e.g. '7.4.1')
 * @returns boolean true if remoteVersion > currentVersion
 */
export function isUpdateAvailable(currentVersion: string, remoteVersion: string): boolean {
  if (!remoteVersion) return false;
  if (!currentVersion) return true;
  return compareVersions(remoteVersion, currentVersion) > 0;
}

export default isUpdateAvailable;
