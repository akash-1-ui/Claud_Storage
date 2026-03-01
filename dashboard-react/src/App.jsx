import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";
import Login from "./Login";
import Register from "./Register";
import Intro from "./Intro";
import Loader from "./Loader";
import { AuthTransitionProvider, useAuthTransition } from "./AuthTransitionContext";

function AuthTransitionOverlay() {
  const { isAuthTransitionActive, transitionMessage } = useAuthTransition();

  if (!isAuthTransitionActive) return null;

  return (
    <div className="auth-loader-screen" role="status" aria-live="polite">
      <Loader />
      <p className="auth-loader-message">{transitionMessage}</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthTransitionProvider>
        <Routes>
          <Route path="/" element={<Intro />} />
          <Route path="/intro" element={<Intro />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
        <AuthTransitionOverlay />
      </AuthTransitionProvider>
    </BrowserRouter>
  );
}

export default App;
