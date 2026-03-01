import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AuthTransitionContext = createContext(null);

export function AuthTransitionProvider({ children }) {
  const [isAuthTransitionActive, setIsAuthTransitionActive] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("Loading...");

  const startAuthTransition = useCallback((message = "Loading...") => {
    setTransitionMessage(message);
    setIsAuthTransitionActive(true);
  }, []);

  const completeAuthTransition = useCallback(() => {
    setIsAuthTransitionActive(false);
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
