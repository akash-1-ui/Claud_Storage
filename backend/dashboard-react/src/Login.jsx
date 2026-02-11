import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/auth.css";
import Loader from "./Loader";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.user.name);
        setShowLoader(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 4000);
      } else {
        alert("Login failed: " + (data.message || "Invalid credentials"));
        setLoading(false);
      }
    } catch (err) {
      alert("Server error. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  if (showLoader) {
    return <Loader />;
  }

  return (
    <div className="auth-container">
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
            <input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p>
            Don't have an account? <a href="#" onClick={() => navigate("/register")}>Sign Up here</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
