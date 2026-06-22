"use client";

import { useEffect, useState } from "react";
import {
  getPermission,
  notifyEnabledPref,
  requestPermission,
  setNotifyEnabledPref,
  showNotification,
} from "@/lib/notify";

/** First-run toggle to enable browser notifications when a render finishes. */
export default function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState<string>("default");

  useEffect(() => {
    setPerm(getPermission());
    setEnabled(notifyEnabledPref());
  }, []);

  const toggle = async () => {
    if (!enabled) {
      const p = await requestPermission();
      setPerm(p);
      if (p === "granted") {
        setEnabled(true);
        setNotifyEnabledPref(true);
        showNotification("Notifikasi aktif ✅", {
          body: "Kamu bakal dikabarin pas clip selesai render.",
        });
      }
    } else {
      setEnabled(false);
      setNotifyEnabledPref(false);
    }
  };

  if (perm === "unsupported") return null;

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 rounded-xl border border-ink-500 bg-ink-700 px-4 py-3 text-left transition hover:border-ink-400"
    >
      <span
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
          enabled ? "bg-brand" : "bg-ink-400"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            enabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
      <span>
        <span className="block text-sm font-semibold">
          Izinkan notifikasi
        </span>
        <span className="block text-xs text-zinc-400">
          {perm === "denied"
            ? "Diblokir browser — aktifkan lewat setting situs."
            : "Dapat notif “Clip kamu udah jadi 🎬” saat render selesai."}
        </span>
      </span>
    </button>
  );
}
