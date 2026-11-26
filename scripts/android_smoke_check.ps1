#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Serial,
    [string]$AdbPath,
    [string]$OutputDirectory,
    [ValidateRange(2, 30)][int]$ObserveSeconds = 10,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repoRoot = Split-Path -Parent $PSScriptRoot
$package = 'com.pomofocus.workspace'
$apk = Join-Path $repoRoot 'public/downloads/PomoFocus-v8.1.apk'
$metadata = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'public/version.json') | ConvertFrom-Json
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repoRoot 'tests/results/android-smoke' }
$selector = @()

function Invoke-Adb {
    param([string[]]$Arguments, [switch]$AllowFailure)
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $script:AdbPath
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($argument in ($script:selector + $Arguments)) { $startInfo.ArgumentList.Add($argument) }
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(120000)) {
            $process.Kill()
            throw "ADB timeout: $($Arguments[0])"
        }
        $result = ($stdout.GetAwaiter().GetResult() + $stderr.GetAwaiter().GetResult()).Trim()
        if ($process.ExitCode -ne 0 -and -not $AllowFailure) { throw "ADB failed ($($Arguments[0])): $result" }
        return $result
    } finally { $process.Dispose() }
}

try {
    if (-not $AdbPath) {
        $command = Get-Command adb -ErrorAction SilentlyContinue
        if ($command) { $AdbPath = $command.Source }
        else {
            $candidates = @(
                (Join-Path ($env:ANDROID_HOME ?? 'D:/Android/Sdk') 'platform-tools/adb.exe'),
                (Join-Path ($env:ANDROID_SDK_ROOT ?? 'D:/Android/Sdk') 'platform-tools/adb.exe'),
                (Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe')
            )
            $AdbPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        }
    }
    if (-not $AdbPath -or -not (Test-Path -LiteralPath $AdbPath)) { throw 'ADB not found. Set ANDROID_HOME or pass -AdbPath.' }
    if (-not (Test-Path -LiteralPath $apk)) { throw "APK not found: $apk" }
    $hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne $metadata.checksumSha256) { throw 'APK SHA-256 does not match public/version.json.' }
    $size = [Math]::Round((Get-Item -LiteralPath $apk).Length / 1MB, 2)
    if ($size -ne $metadata.apkSizeMb) { throw 'APK size does not match public/version.json.' }
    Write-Output (Invoke-Adb -Arguments @('version'))
    Write-Output "APK $($metadata.version) / code $($metadata.versionCode): $size MB; SHA-256 verified."
    if ($CheckOnly) {
        Write-Output 'Prerequisites PASS. No device installation, launch or logcat was performed.'
        exit 0
    }

    $listing = Invoke-Adb -Arguments @('devices', '-l')
    Write-Output $listing
    $online = @($listing -split '\r?\n' | Where-Object { $_ -match '^\S+\s+device(?:\s|$)' } | ForEach-Object { ($_ -split '\s+')[0] })
    if ($Serial) {
        if ($Serial -notin $online) { throw 'Selected device is absent, offline or unauthorized. Unlock the phone and accept USB debugging.' }
    } elseif ($online.Count -eq 1) { $Serial = $online[0] }
    elseif ($online.Count -eq 0) { throw 'No authorized device. Plug in Samsung, unlock it and accept USB debugging.' }
    else { throw 'Multiple devices found. Run again with -Serial to select the intended phone.' }
    $selector = @('-s', $Serial)
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $manufacturer = Invoke-Adb -Arguments @('shell', 'getprop', 'ro.product.manufacturer')
    $model = Invoke-Adb -Arguments @('shell', 'getprop', 'ro.product.model')
    Write-Output (Invoke-Adb -Arguments @('install', '-r', $apk))
    $installed = Invoke-Adb -Arguments @('shell', 'dumpsys', 'package', $package)
    if ($installed -notmatch ('versionName=' + [regex]::Escape($metadata.version) + '(?:\s|$)') -or
        $installed -notmatch ('versionCode=' + $metadata.versionCode + '(?:\s|$)')) { throw 'Installed package version/code does not match release metadata.' }

    # Use a time bookmark; never clear the phone's existing logcat or app data.
    $since = Invoke-Adb -Arguments @('shell', 'date', '"+%m-%d %H:%M:%S.000"')
    [void](Invoke-Adb -Arguments @('shell', 'am', 'force-stop', $package))
    $launch = Invoke-Adb -Arguments @('shell', 'am', 'start', '-W', '-n', "$package/.MainActivity")
    if ($launch -match '(?im)^Error|Exception|Status:\s*(?!ok)\S+') { throw "Launch failed: $launch" }
    $appProcessId = Invoke-Adb -Arguments @('shell', 'pidof', '-s', $package) -AllowFailure
    if ($appProcessId -notmatch '^\d+$') {
        $crash = Invoke-Adb -Arguments @('logcat', '-b', 'crash', '-d', '-T', $since) -AllowFailure
        @($crash -split '\r?\n' | Where-Object { $_ -match [regex]::Escape($package) }) |
            Set-Content -LiteralPath (Join-Path $OutputDirectory 'startup-crash.txt') -Encoding utf8
        throw 'App did not stay running after launch; package-specific crash lines saved in startup-crash.txt.'
    }
    # An empty callback checks route handling only; it cannot prove Google login succeeds.
    $deepLink = Invoke-Adb -Arguments @('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', 'pomofocus://oauth/callback', '-p', $package)
    if ($deepLink -match '(?im)^Error|unable to resolve Intent|Exception') { throw "Deep link route failed: $deepLink" }
    Start-Sleep -Seconds $ObserveSeconds
    $log = Invoke-Adb -Arguments @('logcat', '-d', '-v', 'threadtime', '-T', $since, "--pid=$appProcessId")
    # Keep only the app process, and redact OAuth credentials before writing evidence.
    $log = $log -replace '(?i)((?:access_token|refresh_token|id_token|authorization_code)[=:\s"'']+)[^\s&"'',]+', '$1[redacted]'
    $log = $log -replace '(?i)Bearer\s+[A-Za-z0-9._~-]+', 'Bearer [redacted]'
    $log = $log -replace '(?i)([?&]code=)[^\s&"'']+', '$1[redacted]'
    $log | Set-Content -LiteralPath (Join-Path $outputDirectory 'logcat.txt') -Encoding utf8
    $launch | Set-Content -LiteralPath (Join-Path $outputDirectory 'launch.txt') -Encoding utf8
    $deepLink | Set-Content -LiteralPath (Join-Path $outputDirectory 'deep-link.txt') -Encoding utf8
    # ART can fall back from a non-executable WebView image while the page renders normally.
    # Keep this exact warning in evidence without masking app/Chromium failures.
    $runtimeImageWarning = '\sW\s+\S+:\s+Loading .*/base\.odex non-executable as it requires an image which we failed to load$'
    $warnings = @($log -split '\r?\n' | Where-Object { $_ -match $runtimeImageWarning })
    $errors = @($log -split '\r?\n' | Where-Object { $_ -notmatch $runtimeImageWarning -and $_ -match 'FATAL EXCEPTION|Fatal signal|Uncaught (?:Error|TypeError|ReferenceError)|net::ERR_|WebView.*(?:error|fail)|AudioContext.*(?:error|failed|not allowed)|NotAllowedError|OAuth.*(?:error|fail|invalid)' })
    $finalProcessId = Invoke-Adb -Arguments @('shell', 'pidof', '-s', $package) -AllowFailure
    $passed = $finalProcessId -eq $appProcessId -and $errors.Count -eq 0
    [ordered]@{
        checkedAt = [DateTimeOffset]::Now.ToString('o'); serial = $Serial; manufacturer = $manufacturer; model = $model
        version = $metadata.version; versionCode = $metadata.versionCode; apkSizeMb = $size; sha256 = $hash
        install = 'pass'; launch = 'pass'; deepLinkRoute = 'pass'; realOAuthLogin = 'not tested'
        observedSeconds = $ObserveSeconds; processStayedAlive = ($finalProcessId -eq $appProcessId); matchedErrors = $errors; matchedWarnings = $warnings; passed = $passed
    } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $outputDirectory 'summary.json') -Encoding utf8
    if (-not $passed) { throw "Smoke FAIL: process changed/stopped or $($errors.Count) matching log errors. See $outputDirectory" }
    Write-Output "Smoke PASS: install, launch, callback route; app stayed alive for $ObserveSeconds seconds."
    Write-Output "Evidence: $outputDirectory (real OAuth login and visual UI are not verified)."
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
}
