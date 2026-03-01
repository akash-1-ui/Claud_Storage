import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const AuthTransitionContext = createContext(null);
const MIN_AUTH_TRANSITION_MS = 1600;

export function AuthTransitionProvider({ children }) {
  const [isAuthTransitionActive, setIsAuthTransitionActive] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("Loading...");
  const transitionStartedAtRef = useRef(0);
  const hideTimeoutRef = useRef(null);

  const startAuthTransition = useCallback((message = "Loading...") => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    transitionStartedAtRef.current = Date.now();
    setTransitionMessage(message);
    setIsAuthTransitionActive(true);
  }, []);

  const completeAuthTransition = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    const elapsed = Date.now() - transitionStartedAtRef.current;
    const remaining = Math.max(MIN_AUTH_TRANSITION_MS - elapsed, 0);

    if (remaining === 0) {
      setIsAuthTransitionActive(false);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsAuthTransitionActive(false);
      hideTimeoutRef.current = null;
    }, remaining);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      isAuthTransitionActive,
      transitionMessage,
      startAuthTransition,
      completeAuthTransition,
    }),
    [isAuthTransitionActive, transitionMessage, startAuthTransition, completeAuthTransition]
  );

  return (
    <AuthTransitionContext.Provider value={contextValue}>
      {children}
    </AuthTransitionContext.Provider>
  );
}

export function useAuthTransition() {
  const context = useContext(AuthTransitionContext);
  if (!context) {
    throw new Error("useAuthTransition must be used within an AuthTransitionProvider");
  }
  return context;
}
