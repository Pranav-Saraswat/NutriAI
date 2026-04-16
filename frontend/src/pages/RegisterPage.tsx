import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (requestError) {
      const apiErrors = requestError.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length) {
        setError(apiErrors.join(" "));
        return;
      }
      setError(requestError.response?.data?.error || "Registration failed.");
    }
  };

  return (
    <section className="card form-card">
      <h2>Create account</h2>
      <form onSubmit={handleSubmit} className="stack">
        <input
          type="text"
          placeholder="Full name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={form.confirm_password}
          onChange={(event) => setForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="solid-btn" type="submit">Create account</button>
      </form>
    </section>
  );
};
