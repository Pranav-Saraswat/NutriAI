import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await api.post("/auth/login", form);
      const payload = response.data;
      login({ token: payload.token, user: payload.data.user });

      if (!payload.data.user.age || !payload.data.user.goal_type) {
        navigate("/profile-setup");
      } else {
        navigate("/chat");
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Login failed.");
    }
  };

  return (
    <section className="card form-card">
      <h2>Welcome back</h2>
      <form onSubmit={handleSubmit} className="stack">
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
        {error ? <p className="error-text">{error}</p> : null}
        <button className="solid-btn" type="submit">Login</button>
      </form>
    </section>
  );
};
