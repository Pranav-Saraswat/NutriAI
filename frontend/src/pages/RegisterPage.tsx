import { type FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (requestError: unknown) {
      if (!isAxiosError(requestError)) {
        setError("Registration failed.");
        return;
      }

      if (!requestError.response) {
        setError("Cannot reach the API server. Check your deployed API configuration and try again.");
        return;
      }

      const apiErrors = requestError.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length) {
        setError(apiErrors.join(" "));
        return;
      }
      setError(requestError.response?.data?.error || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-shell register-shell">
      <aside className="auth-panel" aria-hidden="true">
        <p className="eyebrow">Start Strong</p>
        <h1>Create a plan that follows your training goal.</h1>
        <div className="auth-stats">
          <span>Personal targets</span>
          <span>Weight logs</span>
          <span>AI meal guidance</span>
        </div>
      </aside>

      <form onSubmit={handleSubmit} className="card auth-card">
        <div className="auth-heading">
          <p className="eyebrow">Create Account</p>
          <h2>Join NutriAI</h2>
          <p>Set up your account now, then add your training profile next.</p>
        </div>

        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            placeholder="Your name"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </label>

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
            placeholder="Create a password"
            autoComplete="new-password"
            minLength={6}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            placeholder="Repeat your password"
            autoComplete="new-password"
            minLength={6}
            value={form.confirm_password}
            onChange={(event) => setForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
            required
          />
        </label>

        {error ? <p className="error-text auth-error">{error}</p> : null}

        <button className="solid-btn auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </section>
  );
};
