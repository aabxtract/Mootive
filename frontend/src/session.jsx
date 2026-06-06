import { createContext, useContext, useEffect, useState } from "react";

/**
 * Holds the "logged in" user across screens. Persisted to localStorage so a
 * page refresh during the demo doesn't kick you back to the login screen.
 */
const SessionContext = createContext(null);

const STORAGE_KEY = "mootive.user";
const ACTIVE_DELIVERY_KEY = "mootive.activeDeliveryId";
const COMPLETION_KEY = "mootive.completionSummary";

function readStoredJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(() => readStoredJson(STORAGE_KEY));
  const [activeDeliveryId, setActiveDeliveryId] = useState(() =>
    readStoredJson(ACTIVE_DELIVERY_KEY)
  );
  const [completionSummary, setCompletionSummary] = useState(() =>
    readStoredJson(COMPLETION_KEY)
  );

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    if (activeDeliveryId) {
      localStorage.setItem(ACTIVE_DELIVERY_KEY, JSON.stringify(activeDeliveryId));
    } else {
      localStorage.removeItem(ACTIVE_DELIVERY_KEY);
    }
  }, [activeDeliveryId]);

  useEffect(() => {
    if (completionSummary) {
      localStorage.setItem(COMPLETION_KEY, JSON.stringify(completionSummary));
    } else {
      localStorage.removeItem(COMPLETION_KEY);
    }
  }, [completionSummary]);

  function clearFlow() {
    setActiveDeliveryId(null);
    setCompletionSummary(null);
  }

  function logout() {
    setUser(null);
    clearFlow();
  }

  return (
    <SessionContext.Provider
      value={{
        user,
        setUser,
        logout,
        activeDeliveryId,
        setActiveDeliveryId,
        completionSummary,
        setCompletionSummary,
        clearFlow,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
