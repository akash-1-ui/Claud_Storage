import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./css/auth.css";
import luffyBg from "./assets/luffy.jpg";

function Intro() {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleNavigate = (path) => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate(path);
      setIsTransitioning(false);
    }, 600);
  };

  return (
    <div
      className={`intro-container ${isTransitioning ? 'page-lift' : ''}`}
      style={{
        backgroundImage: `url(${luffyBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "scroll",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        transition: "all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        transform: isTransitioning ? "translateY(-100vh) scale(0.95)" : "translateY(0)",
        opacity: isTransitioning ? 0 : 1,
        boxShadow: isTransitioning ? "0 -50px 100px rgba(0, 0, 0, 0.5)" : "none",
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          zIndex: 1,
        }}
      ></div>

      {/* Main Content */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        {/* Heading Section */}
        <h1
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "white",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            margin: "0 0 10px 0",
          }}
        >
          Cloud Box
        </h1>
        <h2
          style={{
            fontSize: "32px",
            fontWeight: 600,
            color: "#e5e5e5",
            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            margin: "0 0 40px 0",
          }}
        >
        </h2>

        {/* Get Started Button */}
        <div style={{ marginTop: "40px" }}>
          <button
            className="btn-primary"
            onClick={() => handleNavigate("/register")}
            style={{
              padding: "14px 48px",
              fontSize: "18px",
              fontWeight: 700,
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(37, 99, 235, 0.4)",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(37, 99, 235, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 15px rgba(37, 99, 235, 0.4)";
            }}
          >
            Get Started
          </button>
        </div>

        {/* Footer */}
        <p
          className="intro-footer"
          style={{
            color: "#e5e5e5",
            marginTop: "30px",
            textShadow: "0 1px 5px rgba(0,0,0,0.5)",
            fontSize: "16px",
          }}
        >
          Already have an account?{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate("/login");
            }}
            style={{
              color: "white",
              fontWeight: 600,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}

export default Intro;
