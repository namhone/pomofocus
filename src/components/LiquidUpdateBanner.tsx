import React, { useState, useEffect } from 'react';
import { Sparkles, Download, X, ArrowUpRight } from 'lucide-react';
import { isUpdateAvailable } from '../utils/versionCompare';
import { resolveApiUrl } from '../utils/apiConfig';

export const CURRENT_APP_VERSION = '8.0.0';
export const DEFAULT_DOWNLOAD_URL = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.0.apk';

export interface LiquidUpdateBannerProps {
  currentVersion?: string;
  latestVersion?: string;
  downloadUrl?: string;
  changelog?: string[];
}

export const LiquidUpdateBanner: React.FC<LiquidUpdateBannerProps> = ({
  currentVersion = CURRENT_APP_VERSION,
  latestVersion: propLatestVersion,
  downloadUrl: propDownloadUrl,
  changelog: propChangelog,
}) => {
  const [remoteVersion, setRemoteVersion] = useState<string | null>(propLatestVersion || null);
  const [downloadUrl, setDownloadUrl] = useState<string>(propDownloadUrl || DEFAULT_DOWNLOAD_URL);
  const [changelog, setChangelog] = useState<string[]>(propChangelog || []);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (propLatestVersion) {
      setRemoteVersion(propLatestVersion);
      if (propDownloadUrl) setDownloadUrl(propDownloadUrl);
      if (propChangelog) setChangelog(propChangelog);
      return;
    }

    let isMounted = true;
    fetch(resolveApiUrl('/version.json'))
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.version) setRemoteVersion(data.version);
        if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
        if (Array.isArray(data.changelog)) {
          setChangelog(data.changelog);
        } else if (typeof data.releaseNotes === 'string') {
          setChangelog([data.releaseNotes]);
        }
      })
      .catch(() => {
        // Safe fail-soft handling for network or offline errors
      });

    return () => {
      isMounted = false;
    };
  }, [propLatestVersion, propDownloadUrl, propChangelog]);

  const targetVersion = remoteVersion || propLatestVersion;

  // Determine if update is available and not previously dismissed in this session
  const updateAvailable = Boolean(
    targetVersion &&
    isUpdateAvailable(currentVersion, targetVersion)
  );

  const storageKey = targetVersion ? `dismissed_version_${targetVersion}` : null;
  const isPreviouslyDismissed = Boolean(
    storageKey &&
    typeof sessionStorage !== 'undefined' &&
    sessionStorage.getItem(storageKey) === 'true'
  );

  if (!updateAvailable || isDismissed || isPreviouslyDismissed || !targetVersion) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (storageKey && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(storageKey, 'true');
      } catch {}
    }
  };

  // Safe truncation for long changelog items (per Tier 2 test 2.12)
  const formatChangelogItem = (text: string) => {
    if (text.length > 200) {
      return `${text.slice(0, 197)}...`;
    }
    return text;
  };

  return (
    <aside
      data-testid="liquid-update-banner"
      role="region"
      aria-label="Thông báo cập nhật ứng dụng"
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-40 select-none animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950/90 backdrop-blur-2xl border border-emerald-500/30 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-white/10 text-white">
        {/* Subtle emerald breathing accent glow in corner */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-emerald-500/15 blur-2xl animate-pulse"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Cập nhật mới
                </span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-emerald-300">
                  v{targetVersion}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-zinc-100">
                Đã có phiên bản mới
              </h4>
            </div>
          </div>

          <button
            type="button"
            data-testid="banner-dismiss-btn"
            onClick={handleDismiss}
            aria-label="Đóng thông báo cập nhật"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {changelog.length > 0 && (
          <div className="mt-2.5 space-y-1 text-xs text-zinc-300/90 border-t border-white/5 pt-2">
            {changelog.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-emerald-400 font-bold shrink-0">•</span>
                <span className="line-clamp-2">{formatChangelogItem(item)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3.5 flex items-center gap-2">
          <a
            data-testid="banner-download-btn"
            href={downloadUrl}
            download={`PomoFocus-v${targetVersion}.apk`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-semibold text-xs transition duration-200 shadow-[0_0_16px_rgba(16,185,129,0.35)] active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Tải bản cập nhật</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
          </a>
          <button
            type="button"
            onClick={handleDismiss}
            className="h-9 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition active:scale-95 border border-white/5"
          >
            Để sau
          </button>
        </div>
      </div>
    </aside>
  );
};

export default LiquidUpdateBanner;
