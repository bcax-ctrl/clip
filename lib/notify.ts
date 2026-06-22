// Client-side notification helpers (Phase 5).

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotifyPermission {
  if (!notifySupported()) return "unsupported";
  return Notification.permission as NotifyPermission;
}

export async function requestPermission(): Promise<NotifyPermission> {
  if (!notifySupported()) return "unsupported";
  try {
    const p = await Notification.requestPermission();
    return p as NotifyPermission;
  } catch {
    return "denied";
  }
}

/**
 * Show a notification. Prefers the service worker registration so it also
 * works when the app/tab is backgrounded; falls back to a plain Notification.
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!notifySupported() || Notification.permission !== "granted") return;
  const opts: NotificationOptions = {
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    ...options,
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, opts);
      return;
    }
  } catch {
    /* fall through to plain Notification */
  }
  new Notification(title, opts);
}

const PREF_KEY = "clipforge:notify";

export function notifyEnabledPref(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(PREF_KEY) === "1";
}

export function setNotifyEnabledPref(on: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PREF_KEY, on ? "1" : "0");
}
