import { useCallback, useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "./config";

const GOOGLE_SCRIPT_ID = "google-identity-services-script";

const loadGoogleIdentityScript = () =>
  new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      if (existingScript.getAttribute("data-ready") === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google sign-in script")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.setAttribute("data-ready", "true");
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google sign-in script"));
    document.head.appendChild(script);
  });

function GoogleAuthButton({ mode = "login", onSuccess }) {
  const buttonContainerRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const buttonLabel = mode === "register" ? "Sign up with Google" : "Continue with Google";

  const handleGoogleCredential = useCallback(
    async (response) => {
      try {
        if (!response?.credential) {
          setErrorMessage("Google sign-in did not return a credential.");
          return;
        }

        setErrorMessage("");
        setIsSubmitting(true);

        const apiResponse = await fetch(API_ENDPOINTS.AUTH.GOOGLE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential })
        });

        let data = {};
        try {
          data = await apiResponse.json();
        } catch {
          data = {};
        }

        if (!apiResponse.ok || !data.token) {
          setErrorMessage(data.message || "Google sign-in failed.");
          return;
        }

        onSuccess(data);
      } catch (error) {
        setErrorMessage("Google sign-in failed. Please try again.");
        console.error("Google sign-in error:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess]
  );

  useEffect(() => {
    let isActive = true;

    const initializeGoogleButton = async () => {
      if (!googleClientId) {
        return;
      }

      try {
        await loadGoogleIdentityScript();

        if (!isActive || !buttonContainerRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential
        });

        const renderedWidth = Math.max(
          220,
          Math.floor(buttonContainerRef.current.getBoundingClientRect().width || 320)
        );

        buttonContainerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          type: "standard",
          shape: "rectangular",
          theme: "outline",
          text: mode === "register" ? "signup_with" : "continue_with",
          size: "large",
          width: renderedWidth
        });
      } catch (error) {
        if (isActive) {
          setErrorMessage("Unable to load Google sign-in right now.");
        }
      }
    };

    initializeGoogleButton();

    return () => {
      isActive = false;
    };
  }, [googleClientId, handleGoogleCredential, mode]);

  return (
    <div className="google-auth-section">
      <div className="auth-divider">
        <span>or</span>
      </div>

      {googleClientId ? (
        <div ref={buttonContainerRef} className="google-auth-button-host" />
      ) : (
        <button type="button" className="google-auth-disabled-btn" disabled>
          {buttonLabel}
        </button>
      )}

      {isSubmitting && <p className="google-auth-note">Signing in with Google...</p>}
      {!googleClientId && (
        <p className="google-auth-note">
          Google sign-in is disabled. Set <code>VITE_GOOGLE_CLIENT_ID</code> in frontend env.
        </p>
      )}
      {errorMessage && <p className="google-auth-note google-auth-note-error">{errorMessage}</p>}
    </div>
  );
}

export default GoogleAuthButton;
