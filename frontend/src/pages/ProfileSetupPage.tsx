import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const emptyProfile = {
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
};

export const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState(emptyProfile);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await api.post("/profile-setup", form);
      setUser(response.data.data);
      navigate("/chat");
    } catch (requestError) {
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
      <h2>Complete profile</h2>
      <form className="stack" onSubmit={handleSubmit}>
        <input type="number" min="1" max="120" placeholder="Age" value={form.age} onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))} required />
        <select value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))} required>
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <input type="number" min="50" max="250" placeholder="Height (cm)" value={form.height} onChange={(event) => setForm((prev) => ({ ...prev, height: event.target.value }))} required />
        <input type="number" min="20" max="300" step="0.1" placeholder="Weight (kg)" value={form.weight} onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))} required />
        <select value={form.goal_type} onChange={(event) => setForm((prev) => ({ ...prev, goal_type: event.target.value }))} required>
          <option value="">Goal</option>
          <option value="weight_loss">Weight loss</option>
          <option value="muscle_gain">Muscle gain</option>
          <option value="maintain">Maintain weight</option>
          <option value="improve_health">Improve health</option>
        </select>
        <input type="number" min="20" max="300" step="0.1" placeholder="Target weight (optional)" value={form.target_weight} onChange={(event) => setForm((prev) => ({ ...prev, target_weight: event.target.value }))} />
        <select value={form.activity_level} onChange={(event) => setForm((prev) => ({ ...prev, activity_level: event.target.value }))} required>
          <option value="">Activity level</option>
          <option value="sedentary">Sedentary</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="active">Active</option>
          <option value="very_active">Very active</option>
        </select>
        <input type="text" placeholder="Dietary preferences" value={form.dietary_preferences} onChange={(event) => setForm((prev) => ({ ...prev, dietary_preferences: event.target.value }))} />
        <textarea placeholder="Allergies" value={form.allergies} onChange={(event) => setForm((prev) => ({ ...prev, allergies: event.target.value }))} />
        <textarea placeholder="Medical conditions" value={form.medical_conditions} onChange={(event) => setForm((prev) => ({ ...prev, medical_conditions: event.target.value }))} />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="solid-btn" type="submit">Save profile</button>
      </form>
    </section>
  );
};
