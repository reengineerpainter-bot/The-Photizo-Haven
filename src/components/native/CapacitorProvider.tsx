"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { registerPushNotifications } from "@/lib/native/push-notifications";

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function initNativeShell() {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0a0a12" });
        await SplashScreen.hide();

        if (Capacitor.getPlatform() === "android") {
          await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
        }

        await registerPushNotifications();
      } catch (err) {
        console.warn("[capacitor] init failed", err);
      }
    }

    initNativeShell();

    const listeners: Promise<{ remove: () => void }>[] = [];

    listeners.push(
      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      })
    );

    listeners.push(
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          document.documentElement.classList.remove("app-backgrounded");
        } else {
          document.documentElement.classList.add("app-backgrounded");
        }
      })
    );

    return () => {
      listeners.forEach((p) => p.then((l) => l.remove()));
    };
  }, []);

  return <>{children}</>;
}
