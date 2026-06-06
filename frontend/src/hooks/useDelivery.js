import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export function useDelivery(id) {
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const { delivery: nextDelivery } = await api.getDelivery(id);
      setDelivery(nextDelivery);
    } catch (err) {
      setError(err.message || "Could not load delivery.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { delivery, setDelivery, loading, error, refresh };
}
