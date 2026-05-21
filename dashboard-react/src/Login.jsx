import { useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "./config";
import "./css/auth.css";
import { useAuthTransition } from "./AuthTransitionContext";
import { getApiErrorMessage, readApiResponse } from "./http";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const { startAuthTransition } = useAuthTransition();

  useLayoutEffect(() => {
    document.body.classList.add("auth-page");
    return () => {
      document.body.classList.remove("auth-page");
    };
  }, []);

  const handleAuthSuccess = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("userName", data.user.name);
    navigate("/dashboard", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErrorMessage("");
    setLoading(true);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const { data, rawText } = await readApiResponse(res);
      if (res.ok && data.token) {
        startAuthTransition("Opening your dashboard...");
        handleAuthSuccess(data);
      } else {
        const errorMessage = getApiErrorMessage(
          res,
          data,
          rawText,
          "Invalid credentials"
        );
        setErrorMessage(errorMessage);
        setLoading(false);
      }
    } catch (err) {
      setErrorMessage("Server error. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="auth-container auth-container-login">
      <div className="auth-left auth-left-login">
        <div className="auth-left-content">
          <h1>
            Welcome Back to <span className="highlight">CloudBox</span>
          </h1>
        </div>
      </div>

      <div className="auth-box">
        <div className="auth-form-wrapper">
          <div className="form-header">
            <h2>Sign In</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email or Username</label>
            <input
              id="login-email"
              type="text"
              name="email"
              autoComplete="username"
              placeholder="Enter your email or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <div className="auth-password-field">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-password-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-password-toggle"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
            {errorMessage && (
              <div className="auth-error-message" role="alert">
                {errorMessage}
              </div>
            )}
          </form>
          <p>
            Don't have an account?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/register");
              }}
            >
              Sign Up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
