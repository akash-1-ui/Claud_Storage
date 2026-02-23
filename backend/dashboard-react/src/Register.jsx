import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "./config";
import "./css/auth.css";
import Loader from "./Loader";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const showRegistrationSuccessMessage = () => {
    const messageDiv = document.createElement("div");
    messageDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 30px 50px;
      borderRadius: 20px;
      fontSize: 18px;
      fontWeight: 600;
      zIndex: 9999;
      boxShadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      animation: slideInScale 0.4s ease-out, fadeOutScale 0.4s ease-in 2.6s forwards;
      textAlign: center;
    `;
    messageDiv.textContent = "Successfully Registered";
    document.body.appendChild(messageDiv);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideInScale {
        0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
      @keyframes fadeOutScale {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  };

  const handleAuthSuccess = (data, showSuccessMessage = false) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("userName", data.user.name);

    if (showSuccessMessage) {
      showRegistrationSuccessMessage();
    }

    setShowLoader(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 1200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, email, password })
      });

      const data = await res.json();
      if (data.token) {
        handleAuthSuccess(data, true);
      } else {
        alert("Registration failed: " + (data.message || "Please try again"));
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
      <div className="auth-left auth-left-register">
        <div className="auth-left-content">
          <h1>
            Start Your Journey with 100% Free <span className="highlight">CloudBox</span>
          </h1>
        </div>
      </div>

      <div className="auth-box">
        <div className="auth-form-wrapper">
          <div className="form-header">
            <h2>Sign Up</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              type="text"
              name="name"
              autoComplete="username"
              placeholder="Enter your username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="register-password">Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: "72px", width: "100%", boxSizing: "border-box", height: "44px" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "17%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "none",
                  color: "#2563eb",
                  fontWeight: 600
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Registering..." : "Sign Up"}
            </button>
          </form>
          <p>
            Already Signed up?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/login");
              }}
            >
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
