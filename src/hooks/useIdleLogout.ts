import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

/** Log users out after this much continuous inactivity. */
export const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "pointerdown",
  "wheel",
];

const STORAGE_KEY = "homiva:last-activity-at";

/**
 * Ends the Appwrite session after IDLE_TIMEOUT_MS with no user interaction.
 * Activity is shared across tabs via localStorage so one active tab keeps the session alive.
 */
export function useIdleLogout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);
  const logoutRef = useRef(logout);
  const navigateRef = useRef(navigate);
  const userRef = useRef(user);

  logoutRef.current = logout;
  navigateRef.current = navigate;
  userRef.current = user;

  useEffect(() => {
    if (!user) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }

    const expireSession = async () => {
      if (!userRef.current) return;
      try {
        await logoutRef.current();
      } finally {
        localStorage.removeItem(STORAGE_KEY);
        toast.message("Signed out due to inactivity", {
          description:
            "For security, Homiva ends idle sessions after 2 minutes.",
        });
        navigateRef.current("/login", { replace: true });
      }
    };

    let lastMarked = 0;
    const markActivity = () => {
      const now = Date.now();
      // Throttle high-frequency pointer events under concurrent client load.
      if (now - lastMarked < 1_000) return;
      lastMarked = now;
      localStorage.setItem(STORAGE_KEY, String(now));
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void expireSession();
      }, IDLE_TIMEOUT_MS);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const last = Number(event.newValue);
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - last);
      timerRef.current = window.setTimeout(() => {
        void expireSession();
      }, Math.max(0, remaining));
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const last = Number(localStorage.getItem(STORAGE_KEY) || "0");
      if (last && Date.now() - last >= IDLE_TIMEOUT_MS) {
        void expireSession();
        return;
      }
      markActivity();
    };

    markActivity();
    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, markActivity, { passive: true });
    }
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, markActivity);
      }
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);
}
