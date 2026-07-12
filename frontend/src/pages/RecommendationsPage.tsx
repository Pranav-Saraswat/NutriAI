import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import type { RecommendationItem } from "../types/api";

export const RecommendationsPage = () => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/meals/recommendations");
      setRecommendations(response.data.data?.recommendations || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch meal recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecommendations();
  }, []);

  return (
    <section className="recommendations-shell">
      <header className="dashboard-hero" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p className="eyebrow">Personalized Training Fuel</p>
          <h1>AI Meal Recommendations</h1>
          <p>Get meal suggestions calculated based on your remaining macronutrient goals for today.</p>
        </div>
        <button type="button" className="solid-btn" onClick={fetchRecommendations} disabled={loading}>
          {loading ? "Calculating..." : "Refresh Recommendations"}
        </button>
      </header>

      {error ? (
        <div
          className="card"
          style={{ borderColor: "var(--danger)", background: "rgba(255,107,107,0.05)", marginBottom: "1rem" }}
        >
          <p style={{ color: "var(--danger)", margin: 0, fontWeight: "bold" }}>{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div className="spinner" />
          <p>Reviewing today's macros and creating choices...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <article className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h3>Macros fully hit!</h3>
          <p style={{ color: "var(--muted)", maxWidth: "460px", margin: "0 auto" }}>
            You have hit or exceeded your caloric and protein targets for today. Excellent discipline! Check back tomorrow for new fuel recommendations.
          </p>
        </article>
      ) : (
        <div>
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            Based on your active goals and dietary profile, here are three customized choices for your next meal:
          </p>
          <div className="recommendations-grid">
            {recommendations.map((item, index) => (
              <div className="recommendation-card" key={index}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="recommendation-macros">
                  <span>
                    Calories: <strong>{item.calories} kcal</strong>
                  </span>
                  <span style={{ color: "var(--accent-2)" }}>
                    P: <strong>{item.protein}g</strong>
                  </span>
                  <span>
                    C: <strong>{item.carbs}g</strong>
                  </span>
                  <span>
                    F: <strong>{item.fat}g</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
