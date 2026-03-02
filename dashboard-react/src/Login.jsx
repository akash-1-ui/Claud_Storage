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
        alert("Login failed: " + errorMessage);
        setLoading(false);
      }
    } catch (err) {
      alert("Server error. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="auth-container auth-container-login">
      <div className="auth-left auth-left-login">
        <div className="auth-left-content">
          <h1>Welcome Back to <span className="highlight">CloudBox</span></h1>
        </div>
      </div>

      <div className="auth-box">
        <div className="auth-form-wrapper">
          <div className="form-header">
            <h2>Sign In</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="login-password">Password</label>
            <div style={{position: 'relative', display: 'flex', alignItems: 'center', width: '100%'}}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{paddingRight: '40px', width: '100%', boxSizing: 'border-box', height: '44px'}}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '17%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'none'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
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

