import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/auth/login", form);
      const payload = response.data;
      login({ token: payload.token, user: payload.data.user });

      if (!payload.data.user.age || !payload.data.user.goal_type) {
        navigate("/profile-setup");
      } else {
        navigate("/chat");
      }
    } catch (requestError: unknown) {
      if (!isAxiosError(requestError)) {
        setError("Login failed.");
        return;
      }

      if (!requestError.response) {
        setError("Cannot reach the API server. Start the backend on port 5000 and try again.");
        return;
      }

      setError(requestError.response?.data?.error || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-shell">
      <aside className="auth-panel" aria-hidden="true">
        <p className="eyebrow">Welcome Back</p>
        <h1>Pick up your nutrition plan where you left it.</h1>
        <div className="auth-stats">
          <span>Macro tracking</span>
          <span>Goal-aware coaching</span>
          <span>Progress check-ins</span>
        </div>
      </aside>

      <form onSubmit={handleSubmit} className="card auth-card">
        <div className="auth-heading">
          <p className="eyebrow">Member Login</p>
          <h2>Sign in to NutriAI</h2>
          <p>Continue to your chat, profile, and daily nutrition targets.</p>
        </div>

        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
        </label>

        {error ? <p className="error-text auth-error">{error}</p> : null}

        <button className="solid-btn auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Login"}
        </button>

        <p className="auth-switch">
          New to NutriAI? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </section>
  );
};
