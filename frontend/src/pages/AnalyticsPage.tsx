import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import type { WeeklyDayLog } from "../types/api";

export const AnalyticsPage = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyDayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWeeklySummary = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/meals/weekly-summary");
      setWeeklyData(response.data.data || []);
    } catch {
      setError("Failed to fetch weekly analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchWeeklySummary();
  }, []);

  // Compute SVG Layout dimensions
  const svgWidth = 600;
  const svgHeight = 260;
  const padding = 40;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  // 1. Calorie Chart Calculations (Bar Chart)
  const maxCalories = Math.max(
    3000,
    ...weeklyData.map((d) => d.calories),
    ...weeklyData.map(() => 2500) // Default baseline limit to scale
  );

  const getCalorieY = (val: number) => {
    return padding + chartHeight - (val / maxCalories) * chartHeight;
  };

  // 2. Weight Chart Calculations (Line Chart)
  const weights = weeklyData.map((d) => d.weight || 0).filter((w) => w > 0);
  const minWeight = weights.length ? Math.min(...weights) - 3 : 60;
  const maxWeight = weights.length ? Math.max(...weights) + 3 : 90;
  const weightRange = maxWeight - minWeight;

  const getWeightY = (val: number) => {
    if (weightRange === 0) return padding + chartHeight / 2;
    return padding + chartHeight - ((val - minWeight) / weightRange) * chartHeight;
  };

  const getX = (index: number) => {
    if (weeklyData.length <= 1) return padding + chartWidth / 2;
    return padding + (index / (weeklyData.length - 1)) * chartWidth;
  };

  // Weight line path string generator
  const weightPath = weeklyData
    .map((d, i) => {
      if (!d.weight) return "";
      const x = getX(i);
      const y = getWeightY(d.weight);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Format short date string (e.g. "Jul 12")
  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0" }}>
        <div className="spinner" />
        <p>Loading nutrition analytics...</p>
      </div>
    );
  }

  return (
    <section className="analytics-shell">
      <header className="dashboard-hero" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p className="eyebrow">Aesthetic Analytics</p>
          <h1>Weekly Progress Dashboard</h1>
          <p>Analyze caloric intake, weight variations, and hydration patterns over the last 7 days.</p>
        </div>
      </header>

      {error ? (
        <div
          className="card"
          style={{ borderColor: "var(--danger)", background: "rgba(255,107,107,0.05)", marginBottom: "1rem" }}
        >
          <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>
        </div>
      ) : null}

      <div className="grid-2" style={{ gap: "1.5rem" }}>
        {/* CHART A: CALORIE INTAKE VS Baseline TARGET */}
        <article className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Calorie Intake vs Baseline Target</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>7-Day Log</span>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Compare logged calories against daily targets.
          </p>

          <div className="chart-wrapper">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%">
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = padding + ratio * chartHeight;
                const value = Math.round(maxCalories * (1 - ratio));
                return (
                  <g key={index}>
                    <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#1c2634" strokeWidth="1" />
                    <text x={padding - 5} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="9">
                      {value}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {weeklyData.map((day, i) => {
                const x = padding + (i / 7) * chartWidth + 10;
                const barWidth = (chartWidth / 7) - 15;
                const yLogged = getCalorieY(day.calories);
                // Assume constant baseline target or mock target
                const targetCal = 2200;
                const yTarget = getCalorieY(targetCal);

                return (
                  <g key={i}>
                    {/* Target Bar (Dashed bordered box) */}
                    <rect
                      x={x}
                      y={yTarget}
                      width={barWidth}
                      height={Math.max(0, padding + chartHeight - yTarget)}
                      fill="transparent"
                      stroke="#4b5563"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      rx="3"
                    />
                    {/* Logged Bar (Solid Primary color) */}
                    <rect
                      x={x + 2}
                      y={yLogged}
                      width={barWidth - 4}
                      height={Math.max(0, padding + chartHeight - yLogged)}
                      fill="var(--primary)"
                      rx="3"
                      style={{ transition: "all 0.3s" }}
                    />
                    {/* X-Axis labels */}
                    <text
                      x={x + barWidth / 2}
                      y={svgHeight - padding + 15}
                      textAnchor="middle"
                      fill="var(--muted)"
                      fontSize="9"
                    >
                      {formatShortDate(day.date)}
                    </text>
                    {/* Value tags on hover style */}
                    <text
                      x={x + barWidth / 2}
                      y={yLogged - 5}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {day.calories > 0 ? day.calories : ""}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1.5rem",
              marginTop: "0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <div
                style={{ width: "12px", height: "12px", background: "var(--primary)", borderRadius: "3px" }}
              />
              <span>Logged Intake</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <div
                style={{ width: "12px", height: "12px", border: "1.5px dashed #4b5563", borderRadius: "3px" }}
              />
              <span>Baseline Target</span>
            </div>
          </div>
        </article>

        {/* CHART B: WEIGHT VARIATIONS */}
        <article className="card">
          <h3>Weight Variations Over Time</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Monitor scale fluctuations and linear weight progress.
          </p>

          <div className="chart-wrapper">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%">
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = padding + ratio * chartHeight;
                const value = (maxWeight - ratio * weightRange).toFixed(1);
                return (
                  <g key={index}>
                    <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#1c2634" strokeWidth="1" />
                    <text x={padding - 5} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="9">
                      {value} kg
                    </text>
                  </g>
                );
              })}

              {/* Line path */}
              {weightPath ? (
                <path d={weightPath} fill="none" stroke="var(--accent-2)" strokeWidth="3" />
              ) : null}

              {/* Data points */}
              {weeklyData.map((day, i) => {
                if (!day.weight) return null;
                const x = getX(i);
                const y = getWeightY(day.weight);

                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="5" fill="var(--accent-2)" stroke="#080a0f" strokeWidth="2" />
                    <text x={x} y={y - 8} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">
                      {day.weight.toFixed(1)}
                    </text>
                    <text
                      x={x}
                      y={svgHeight - padding + 15}
                      textAnchor="middle"
                      fill="var(--muted)"
                      fontSize="9"
                    >
                      {formatShortDate(day.date)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", textAlign: "center", marginTop: "0.5rem" }}>
            Points display logged scale logs. Baseline is mapped on profile target weight.
          </p>
        </article>
      </div>

      <div className="grid-2" style={{ gap: "1.5rem", marginTop: "1.5rem" }}>
        {/* Metric tables list */}
        <article className="card">
          <h3>Hydration & Cardio Logs</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Weekly aggregation of water logged and physical step goals.
          </p>

          <table className="message-table" style={{ background: "transparent", width: "100%" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Hydration</th>
                <th>Cardio Steps</th>
                <th>Protein (g)</th>
              </tr>
            </thead>
            <tbody>
              {weeklyData.map((day, i) => (
                <tr key={i}>
                  <td>{new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" })}</td>
                  <td>
                    <span style={{ color: day.water >= 2.0 ? "var(--primary)" : "#60a5fa" }}>
                      {day.water.toFixed(2)} L
                    </span>
                  </td>
                  <td>{day.steps.toLocaleString()} reps</td>
                  <td>{day.protein} g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚡</div>
          <h3>Weekly Nutrition Summary</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem", maxWidth: "420px", marginBottom: "1rem" }}>
            Your protein target achievement rate is high! Hydration levels match your cut targets. Keep logs consistent to optimize your training days.
          </p>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="badge">Avg Calories: {Math.round(weeklyData.reduce((sum, d) => sum + d.calories, 0) / 7)} kcal</div>
            <div className="badge" style={{ borderColor: "var(--accent-2)" }}>Avg Steps: {Math.round(weeklyData.reduce((sum, d) => sum + d.steps, 0) / 7).toLocaleString()} reps</div>
          </div>
        </article>
      </div>
    </section>
  );
};
