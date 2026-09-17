import type { CapacitorConfig } from "@capacitor/cli";

const liveUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.flushfinder.app",
  appName: "Flush Finder",
  webDir: "native/www",
  backgroundColor: "#1e4f4a",
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#1e4f4a",
    scheme: "Flush Finder",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#1e4f4a",
    useLegacyBridge: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#1e4f4a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1e4f4a",
    },
    Keyboard: {
      resize: "body",
    },
  },
};

if (liveUrl) {
  config.server = {
    url: liveUrl,
    androidScheme: "https",
    iosScheme: "https",
  };
}

export default config;
