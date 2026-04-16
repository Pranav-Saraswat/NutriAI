import { Link } from "react-router-dom";

export const HomePage = () => {
  return (
    <section className="hero-card">
      <p className="eyebrow">Personal AI Nutrition Coach</p>
      <h1>Transform your health with data-driven meal and fitness guidance.</h1>
      <p>
        NutriAI delivers structured nutrition plans, fitness suggestions, and progress tracking based on your profile.
      </p>
      <div className="hero-actions">
        <Link className="solid-btn" to="/register">Get Started</Link>
        <Link className="ghost-link" to="/login">I already have an account</Link>
      </div>
    </section>
  );
};
