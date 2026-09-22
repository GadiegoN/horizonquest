import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export function useResource<T>(url: string, pollMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    let canceled = false;
    let inFlight = false;
    async function load(initial: boolean) {
      if (inFlight) return;
      inFlight = true;
      if (initial) setLoading(true);
      try {
        const result = await api.get(url);
        if (!canceled) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (!canceled)
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar os dados.",
          );
      } finally {
        inFlight = false;
        if (!canceled) setLoading(false);
      }
    }
    void load(true);
    const timer = pollMs
      ? window.setInterval(() => {
          if (document.visibilityState === "visible") void load(false);
        }, pollMs)
      : undefined;
    return () => {
      canceled = true;
      window.clearInterval(timer);
    };
  }, [url, version, pollMs]);
  return { data, error, loading, refresh };
}
