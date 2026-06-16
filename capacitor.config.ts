import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const useRemoteServer = serverUrl.length > 0;
const isCleartext = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.photizohaven.app",
  appName: "The Photizo Haven",
  webDir: "mobile/www",
  android: {
    allowMixedContent: isCleartext,
    backgroundColor: "#0a0a12",
    buildOptions: {
      releaseType: "APK",
    },
  },
  server: useRemoteServer
    ? {
        url: serverUrl,
        cleartext: isCleartext,
        androidScheme: isCleartext ? "http" : "https",
      }
    : undefined,
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0a0a12",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a12",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
