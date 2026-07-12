import React, { useEffect, useState, useMemo, useRef, type FormEvent } from "react";
import type { AxiosError } from "axios";
import { api, API_ROOT } from "../api/client";
import type { Meal, DailySummary, FoodItem } from "../types/api";

const ProgressRing = ({
  value,
  target,
  color,
  label,
  unit,
}: {
  value: number;
  target: number;
  color: string;
  label: string;
  unit: string;
}) => {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const strokePct = ((100 - pct) * circ) / 100;

  return (
    <div className="progress-ring-card">
      <svg width="100" height="100">
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#1d2634" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={strokePct}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.35s" }}
        />
        <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">
          {Math.round(pct)}%
        </text>
      </svg>
      <div className="ring-label" style={{ marginTop: "0.5rem" }}>
        <strong>
          {value.toLocaleString()} / {target.toLocaleString()}
        </strong>
        <span>
          {label} ({unit})
        </span>
      </div>
    </div>
  );
};

export const DashboardPage = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);

  // Water and Steps state
  const [waterInput, setWaterInput] = useState("");
  const [stepsInput, setStepsInput] = useState("");

  // Analysis states
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [textDescription, setTextDescription] = useState("");

  // Modal and Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editorForm, setEditorForm] = useState({
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    notes: "",
    imageUrl: null as string | null,
    items: [] as FoodItem[],
    isCorrected: false,
  });

  // Manual log state
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all dashboard data for a date
  const fetchData = async (dateStr: string) => {
    try {
      setError("");
      const [mealsResponse, summaryResponse] = await Promise.all([
        api.get(`/meals?date=${dateStr}`),
        api.get(`/meals/daily-summary?date=${dateStr}`),
      ]);
      setMeals(mealsResponse.data.data || []);
      setSummary(summaryResponse.data.data || null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load dashboard data.");
    }
  };

  useEffect(() => {
    void fetchData(selectedDate);
  }, [selectedDate]);

  // Log water delta (+250ml or +500ml)
  const logWaterDelta = async (deltaLiters: number) => {
    const currentWater = summary?.totals?.water || 0;
    const nextWater = Math.max(0, currentWater + deltaLiters);
    try {
      await api.post("/daily-log", { date: selectedDate, waterIntakeLiters: nextWater });
      void fetchData(selectedDate);
    } catch {
      setError("Failed to update water intake.");
    }
  };

  // Submit water intake form
  const handleWaterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const val = Number(waterInput);
    if (isNaN(val) || val < 0) return;
    try {
      await api.post("/daily-log", { date: selectedDate, waterIntakeLiters: val });
      setWaterInput("");
      void fetchData(selectedDate);
    } catch {
      setError("Failed to update water intake.");
    }
  };

  // Submit steps log form
  const handleStepsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const val = Number(stepsInput);
    if (isNaN(val) || val < 0) return;
    try {
      await api.post("/daily-log", { date: selectedDate, steps: val });
      setStepsInput("");
      void fetchData(selectedDate);
    } catch {
      setError("Failed to update steps.");
    }
  };

  // Handle meal photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setAnalyzing(true);
    setError("");

    try {
      const response = await api.post("/meals/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = response.data.data;
      setEditingMealId(null);
      setEditorForm({
        name: data.name || "AI Analyzed Meal",
        calories: Number(data.calories || 0),
        protein: Number(data.protein || 0),
        carbs: Number(data.carbs || 0),
        fat: Number(data.fat || 0),
        notes: data.notes || "",
        imageUrl: data.imageUrl || null,
        items: data.items || [],
        isCorrected: false,
      });
      setIsEditorOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "AI failed to analyze this image.");
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle text description estimate
  const handleTextAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    if (!textDescription.trim()) return;

    setAnalyzing(true);
    setError("");

    try {
      const response = await api.post("/meals/analyze", { description: textDescription });
      const data = response.data.data;
      setEditingMealId(null);
      setEditorForm({
        name: data.name || textDescription,
        calories: Number(data.calories || 0),
        protein: Number(data.protein || 0),
        carbs: Number(data.carbs || 0),
        fat: Number(data.fat || 0),
        notes: data.notes || "",
        imageUrl: null,
        items: data.items || [],
        isCorrected: false,
      });
      setTextDescription("");
      setIsEditorOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "AI failed to analyze the description.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Open editor for manual correction of logged meal
  const openEditMeal = (meal: Meal) => {
    setEditingMealId(meal.id);
    setEditorForm({
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      notes: meal.notes || "",
      imageUrl: meal.imageUrl,
      items: meal.items || [],
      isCorrected: true,
    });
    setIsEditorOpen(true);
  };

  // Save reviewed meal (Create or Update)
  const saveReviewedMeal = async () => {
    try {
      if (editingMealId) {
        // Update existing meal
        await api.put(`/meals/${editingMealId}`, {
          ...editorForm,
          isCorrected: true,
        });
      } else {
        // Create new meal
        const checkCorrected = editorForm.isCorrected;
        await api.post("/meals", {
          ...editorForm,
          date: selectedDate,
          isCorrected: checkCorrected,
        });
      }
      setIsEditorOpen(false);
      void fetchData(selectedDate);
    } catch {
      setError("Failed to save meal log.");
    }
  };

  // Quick manual log (No AI)
  const saveManualQuickLog = async (e: FormEvent) => {
    e.preventDefault();
    const { name, calories, protein, carbs, fat, notes } = manualForm;
    if (!name || !calories) return;

    try {
      await api.post("/meals", {
        name,
        calories: Number(calories),
        protein: Number(protein || 0),
        carbs: Number(carbs || 0),
        fat: Number(fat || 0),
        notes,
        date: selectedDate,
      });
      setManualForm({ name: "", calories: "", protein: "", carbs: "", fat: "", notes: "" });
      setIsManualLogOpen(false);
      void fetchData(selectedDate);
    } catch {
      setError("Failed to log meal manually.");
    }
  };

  // Delete logged meal
  const deleteMeal = async (id: string) => {
    if (!window.confirm("Delete this meal log?")) return;
    try {
      await api.delete(`/meals/${id}`);
      void fetchData(selectedDate);
    } catch {
      setError("Failed to delete meal.");
    }
  };

  // Detect manual edits in editor popup to mark as corrected
  const handleEditorChange = (field: keyof typeof editorForm, val: any) => {
    setEditorForm((prev) => ({
      ...prev,
      [field]: val,
      isCorrected: true, // Mark corrected on any user inputs change
    }));
  };

  const totals = summary?.totals;
  const targets = summary?.targets;

  return (
    <section className="dashboard-shell">
      <header className="dashboard-hero">
        <div>
          <p className="eyebrow">Interactive Console</p>
          <h1>Daily Nutrition Tracking</h1>
          <p>Analyze meal images, correct macros, log activity levels, and track progress.</p>
        </div>
        <div className="date-picker-wrap">
          <label htmlFor="dashboard-date" style={{ marginRight: "0.5rem", fontWeight: "bold" }}>
            Date:
          </label>
          <input
            id="dashboard-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--line)",
              color: "#fff",
              padding: "0.5rem",
              borderRadius: "6px",
            }}
          />
        </div>
      </header>

      {error ? (
        <div
          className="card"
          style={{ borderColor: "var(--danger)", background: "rgba(255,107,107,0.05)", marginBottom: "1rem" }}
        >
          <p style={{ color: "var(--danger)", margin: 0, fontWeight: "bold" }}>{error}</p>
        </div>
      ) : null}

      {/* Progress Circles */}
      <section className="progress-rings-container">
        <ProgressRing
          value={totals?.calories || 0}
          target={targets?.calories || 2000}
          color="var(--primary)"
          label="Calories"
          unit="kcal"
        />
        <ProgressRing
          value={totals?.protein || 0}
          target={targets?.protein || 150}
          color="var(--accent-2)"
          label="Protein"
          unit="g"
        />
        <ProgressRing
          value={totals?.water || 0}
          target={targets?.water || 2.5}
          color="#3b82f6"
          label="Hydration"
          unit="L"
        />
        <ProgressRing
          value={totals?.steps || 0}
          target={targets?.steps || 10000}
          color="var(--accent)"
          label="Steps"
          unit="reps"
        />
      </section>

      <div className="dashboard-grid">
        {/* Left Side: Logger & History */}
        <div className="stack" style={{ gap: "1.5rem" }}>
          {/* AI Image Upload / Drop Zone */}
          <article className="card">
            <h3>AI Meal Recognizer</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Upload a photo of your meal. The AI will detect food items and estimate macros instantly.
            </p>

            <div className="upload-section">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                disabled={analyzing}
              />
              {analyzing ? (
                <div>
                  <div className="spinner" />
                  <p className="upload-text">AI is analyzing your plate...</p>
                  <p className="upload-hint">Deconstructing ingredients & portion weights</p>
                </div>
              ) : (
                <div>
                  <span className="upload-icon">📸</span>
                  <p className="upload-text">Drag & Drop photo, or click to upload</p>
                  <p className="upload-hint">Supports JPEG, PNG, WEBP up to 5MB</p>
                </div>
              )}
            </div>

            {/* Quick text input estimator */}
            <form onSubmit={handleTextAnalyze} style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={textDescription}
                onChange={(e) => setTextDescription(e.target.value)}
                placeholder="Describe your meal (e.g., 2 fried eggs with sourdough toast)"
                style={{ flex: 1 }}
                required
                disabled={analyzing}
              />
              <button className="solid-btn" type="submit" disabled={analyzing}>
                AI Estimate
              </button>
            </form>
          </article>

          {/* Meals History timeline */}
          <article className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Logged Meals</h3>
              <button
                type="button"
                className="quick-log-btn"
                onClick={() => setIsManualLogOpen(true)}
              >
                + Add Manually
              </button>
            </div>

            {meals.length === 0 ? (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: "1.5rem 0" }}>
                No meals logged for this day yet. Use AI camera above or manual log to start!
              </p>
            ) : (
              <div className="logged-meals-section">
                {meals.map((meal) => (
                  <div className="meal-card-item" key={meal.id}>
                    <div className="meal-card-info">
                      {meal.imageUrl ? (
                        <img
                          className="meal-card-img"
                          src={
                            meal.imageUrl.startsWith("http")
                              ? meal.imageUrl
                              : `${API_ROOT}${meal.imageUrl}`
                          }
                          alt={meal.name}
                        />
                      ) : (
                        <div
                          className="meal-card-img"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.25rem",
                          }}
                        >
                          🍲
                        </div>
                      )}
                      <div className="meal-card-text">
                        <h4>{meal.name}</h4>
                        <div className="meal-card-macros">
                          <span>
                            Calories: <strong>{meal.calories} kcal</strong>
                          </span>
                          <span>
                            P: <strong>{meal.protein}g</strong>
                          </span>
                          <span>
                            C: <strong>{meal.carbs}g</strong>
                          </span>
                          <span>
                            F: <strong>{meal.fat}g</strong>
                          </span>
                        </div>
                        {meal.isCorrected ? (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--primary)",
                              background: "rgba(185,241,63,0.1)",
                              padding: "0.1rem 0.35rem",
                              borderRadius: "4px",
                              marginTop: "0.2rem",
                              display: "inline-block",
                            }}
                          >
                            Corrected
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="meal-actions">
                      <button
                        type="button"
                        className="quick-log-btn"
                        onClick={() => openEditMeal(meal)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="quick-log-btn"
                        style={{ color: "var(--danger)", borderColor: "rgba(255,107,107,0.3)" }}
                        onClick={() => deleteMeal(meal.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>

        {/* Right Side: Quick Add Hydration & Steps */}
        <div className="stack" style={{ gap: "1.5rem" }}>
          <article className="card activity-card">
            <h3>Quick Hydration Log</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
              Quick log water or enter custom value to stay on top of daily targets.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="solid-btn"
                style={{ flex: 1 }}
                onClick={() => void logWaterDelta(0.25)}
              >
                +250 ml
              </button>
              <button
                type="button"
                className="solid-btn"
                style={{ flex: 1 }}
                onClick={() => void logWaterDelta(0.5)}
              >
                +500 ml
              </button>
            </div>
            <form onSubmit={handleWaterSubmit} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="Custom water (Liters)"
                value={waterInput}
                onChange={(e) => setWaterInput(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <button className="quick-log-btn" type="submit">
                Log
              </button>
            </form>
          </article>

          <article className="card activity-card">
            <h3>Quick Steps Log</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
              Track steps daily to meet cardio targets.
            </p>
            <form onSubmit={handleStepsSubmit} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="number"
                min="0"
                max="100000"
                placeholder="Daily steps"
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <button className="solid-btn" type="submit">
                Save
              </button>
            </form>
          </article>
        </div>
      </div>

      {/* 1. INTERACTIVE AI EDITOR MODAL */}
      {isEditorOpen ? (
        <div className="modal-overlay">
          <div className="modal-content">
            <header className="modal-header">
              <h3>{editingMealId ? "Edit Meal Log" : "Review AI Food Analysis"}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsEditorOpen(false)}
              >
                &times;
              </button>
            </header>
            <main className="modal-body">
              <div className="ai-editor-layout">
                <div>
                  {editorForm.imageUrl ? (
                    <img
                      className="ai-preview-img"
                      src={
                        editorForm.imageUrl.startsWith("http")
                          ? editorForm.imageUrl
                          : `${API_ROOT}${editorForm.imageUrl}`
                      }
                      alt="Uploaded food plate"
                    />
                  ) : (
                    <div
                      className="ai-preview-img"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "3rem",
                      }}
                    >
                      🍽️
                    </div>
                  )}
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      textAlign: "center",
                      marginTop: "0.5rem",
                    }}
                  >
                    AI estimates macros. Edit values to correct them.
                  </p>
                </div>
                <div className="stack" style={{ gap: "0.85rem" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Meal Name</label>
                    <input
                      type="text"
                      value={editorForm.name}
                      onChange={(e) => handleEditorChange("name", e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Calories (kcal)</label>
                      <input
                        type="number"
                        value={editorForm.calories}
                        onChange={(e) => handleEditorChange("calories", Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Protein (g)</label>
                      <input
                        type="number"
                        value={editorForm.protein}
                        onChange={(e) => handleEditorChange("protein", Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Carbs (g)</label>
                      <input
                        type="number"
                        value={editorForm.carbs}
                        onChange={(e) => handleEditorChange("carbs", Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Fat (g)</label>
                      <input
                        type="number"
                        value={editorForm.fat}
                        onChange={(e) => handleEditorChange("fat", Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Notes / Additions</label>
                    <textarea
                      rows={2}
                      value={editorForm.notes}
                      onChange={(e) => handleEditorChange("notes", e.target.value)}
                      placeholder="Add custom notes about sauces, sides, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Portion breakdown if recognized */}
              {editorForm.items && editorForm.items.length > 0 ? (
                <div style={{ marginTop: "1rem" }}>
                  <h4>Portion Breakdown</h4>
                  <table
                    className="message-table"
                    style={{ background: "rgba(255,255,255,0.02)", width: "100%", fontSize: "0.85rem" }}
                  >
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Portion</th>
                        <th>Calories</th>
                        <th>Macros (P/C/F)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editorForm.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{item.portionSize}</td>
                          <td>{item.calories} kcal</td>
                          <td>
                            {item.protein}g / {item.carbs}g / {item.fat}g
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </main>
            <footer className="modal-footer">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setIsEditorOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="solid-btn" onClick={saveReviewedMeal}>
                Save Log
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {/* 2. MANUAL QUICK LOG MODAL */}
      {isManualLogOpen ? (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "480px" }}>
            <header className="modal-header">
              <h3>Quick Log Meal</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsManualLogOpen(false)}
              >
                &times;
              </button>
            </header>
            <form onSubmit={saveManualQuickLog}>
              <main className="modal-body stack" style={{ gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Meal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Protein shake"
                    value={manualForm.name}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Calories (kcal)</label>
                    <input
                      type="number"
                      required
                      placeholder="350"
                      value={manualForm.calories}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, calories: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Protein (g)</label>
                    <input
                      type="number"
                      placeholder="25"
                      value={manualForm.protein}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, protein: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Carbs (g)</label>
                    <input
                      type="number"
                      placeholder="15"
                      value={manualForm.carbs}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, carbs: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Fat (g)</label>
                    <input
                      type="number"
                      placeholder="5"
                      value={manualForm.fat}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, fat: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Optional details"
                    value={manualForm.notes}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </main>
              <footer className="modal-footer">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setIsManualLogOpen(false)}
                >
                  Cancel
                </button>
                <button className="solid-btn" type="submit">
                  Log Meal
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};
