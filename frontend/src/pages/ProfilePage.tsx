import { type FormEvent, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export const ProfilePage = () => {
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    goal_type: "",
    target_weight: "",
    activity_level: "",
    dietary_preferences: "",
    allergies: "",
    medical_conditions: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/user").then((response) => {
      const user = response.data.data;
      setForm({
        name: user.name || "",
        age: user.age || "",
        gender: user.gender || "",
        height: user.height_cm || "",
        weight: user.weight_kg || "",
        goal_type: user.goal_type || "",
        target_weight: user.target_weight || "",
        activity_level: user.activity_level || "",
        dietary_preferences: user.dietary_preferences || "",
        allergies: user.allergies || "",
        medical_conditions: user.medical_conditions || "",
      });
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await api.put("/profile", form);
      setUser(response.data.data);
      setMessage("Profile updated.");
    } catch (requestError: unknown) {
      if (!isAxiosError(requestError)) {
        setError("Profile update failed.");
        return;
      }

      const apiErrors = requestError.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length) {
        setError(apiErrors.join(" "));
        return;
      }
      setError(requestError.response?.data?.error || "Profile update failed.");
    }
  };

  return (
    <section className="card form-card">
      <h2>Edit profile</h2>
      <form className="stack" onSubmit={handleSubmit}>
        <input type="text" placeholder="Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
        <input type="number" min="1" max="120" placeholder="Age" value={form.age} onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))} required />
        <select
          aria-label="Gender"
          title="Gender"
          value={form.gender}
          onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
          required
        >
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <input type="number" min="50" max="250" placeholder="Height (cm)" value={form.height} onChange={(event) => setForm((prev) => ({ ...prev, height: event.target.value }))} required />
        <input type="number" min="20" max="300" step="0.1" placeholder="Weight (kg)" value={form.weight} onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))} required />
        <select
          aria-label="Goal"
          title="Goal"
          value={form.goal_type}
          onChange={(event) => setForm((prev) => ({ ...prev, goal_type: event.target.value }))}
          required
        >
          <option value="">Goal</option>
          <option value="weight_loss">Weight loss</option>
          <option value="muscle_gain">Muscle gain</option>
          <option value="maintain">Maintain</option>
          <option value="improve_health">Improve health</option>
        </select>
        <select
          aria-label="Activity level"
          title="Activity level"
          value={form.activity_level}
          onChange={(event) => setForm((prev) => ({ ...prev, activity_level: event.target.value }))}
          required
        >
          <option value="">Activity level</option>
          <option value="sedentary">Sedentary</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="active">Active</option>
          <option value="very_active">Very active</option>
        </select>
        <input type="number" min="20" max="300" step="0.1" placeholder="Target weight" value={form.target_weight} onChange={(event) => setForm((prev) => ({ ...prev, target_weight: event.target.value }))} />
        <input type="text" placeholder="Dietary preferences" value={form.dietary_preferences} onChange={(event) => setForm((prev) => ({ ...prev, dietary_preferences: event.target.value }))} />
        <textarea placeholder="Allergies" value={form.allergies} onChange={(event) => setForm((prev) => ({ ...prev, allergies: event.target.value }))} />
        <textarea placeholder="Medical conditions" value={form.medical_conditions} onChange={(event) => setForm((prev) => ({ ...prev, medical_conditions: event.target.value }))} />
        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <button className="solid-btn" type="submit">Save changes</button>
      </form>
    </section>
  );
};
