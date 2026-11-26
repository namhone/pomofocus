using System;
using System.IO;

// External-process fixture only. Never invokes adb or touches an Android device.
class MockAdb {
    static int Main(string[] args) {
        string scenario = Environment.GetEnvironmentVariable("POMO_SMOKE_SCENARIO") ?? "healthy";
        File.AppendAllText(Environment.GetEnvironmentVariable("POMO_SMOKE_COMMANDS_FILE"), String.Join(" ", args) + "\n");
        int i = args.Length > 1 && args[0] == "-s" ? 2 : 0;
        string command = String.Join(" ", args, i, args.Length - i);
        if (command == "version") Console.WriteLine("Android Debug Bridge: TEST FIXTURE");
        else if (command == "devices -l") {
            Console.WriteLine("List of devices attached");
            if (scenario == "unauthorized") Console.WriteLine("contract-device\tunauthorized");
            else if (scenario != "none") {
                Console.WriteLine("contract-device\tdevice model:Mock_Samsung");
                if (scenario == "multiple") Console.WriteLine("second-device\tdevice");
            }
        }
        else if (command.StartsWith("install -r ")) Console.WriteLine("Success");
        else if (command.Contains("dumpsys package")) Console.WriteLine("versionName=" + Environment.GetEnvironmentVariable("POMO_SMOKE_VERSION") + "\nversionCode=" + Environment.GetEnvironmentVariable("POMO_SMOKE_CODE"));
        else if (command.Contains("ro.product.manufacturer")) Console.WriteLine("TEST FIXTURE");
        else if (command.Contains("ro.product.model")) Console.WriteLine("Mock_Samsung");
        else if (command.StartsWith("shell date")) {
            if (!command.Contains("\"+%m-%d %H:%M:%S.000\"")) { Console.Error.WriteLine("date: Max 1 argument"); return 1; }
            Console.WriteLine("11-26 12:00:00.000");
        }
        else if (command.Contains("am force-stop")) {}
        else if (command.Contains("am start")) {
            if (scenario == "route-fail" && command.Contains("pomofocus://")) Console.WriteLine("Error: unable to resolve Intent");
            else Console.WriteLine("Status: ok");
        }
        else if (command.Contains("pidof")) { if (scenario != "startup-crash") Console.WriteLine("23456"); }
        else if (command.StartsWith("logcat")) {
            if (scenario == "crash" || scenario == "startup-crash") Console.WriteLine("FATAL EXCEPTION: main; Process: com.pomofocus.workspace");
            else if (scenario == "webview") Console.WriteLine("chromium: Uncaught TypeError: failed");
            else if (scenario == "audio") Console.WriteLine("AudioContext failed: NotAllowedError");
            else if (scenario == "runtime-image-warning") Console.WriteLine("11-26 12:00:00.100 23456 23456 W focus.workspace: Loading /data/app/com.google.android.webview-test/oat/arm64/base.odex non-executable as it requires an image which we failed to load");
            else Console.WriteLine("Capacitor: started; access_token=fixture-secret https://example.test?code=fixture-code&state=ok");
        }
        else { Console.Error.WriteLine("Unexpected fake adb command: " + command); return 9; }
        return 0;
    }
}
