/**
 * Registers for push notifications on native Android/iOS.
 * Wire token to your backend when FCM/APNs credentials are configured.
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

let registered = false;

export async function registerPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform() || registered) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;

  await PushNotifications.register();

  await PushNotifications.addListener("registration", (token) => {
    console.info("[push] device token", token.value);
    // TODO: POST token to /api/notifications/register
  });

  await PushNotifications.addListener("registrationError", (err) => {
    console.warn("[push] registration error", err);
  });

  await PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.info("[push] received", notification);
  });

  registered = true;
}
