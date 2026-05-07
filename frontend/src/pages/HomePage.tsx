import { Link } from "react-router-dom";

export const HomePage = () => {
  return (
    <>
      <section className="hero-card training-hero">
        <div className="hero-copy">
          <p className="eyebrow">AI Diet Coach For Training Days</p>
          <h1>NutriAI keeps your meals as disciplined as your reps.</h1>
          <p>
            Build a profile, track weight, and get direct nutrition guidance for cutting, bulking, muscle gain,
            hydration, and recovery.
          </p>
          <div className="hero-actions">
            <Link className="solid-btn" to="/register">Start Training Smarter</Link>
            <Link className="ghost-link" to="/login">Login</Link>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="plate-card">
            <div className="plate">
              <span className="food protein" />
              <span className="food greens" />
              <span className="food carbs" />
            </div>
            <div className="macro-stack">
              <span>Protein 168g</span>
              <span>Calories 2,450</span>
              <span>Water 3.4L</span>
            </div>
          </div>
          <div className="lift-card">
            <span className="barbell" />
            <strong>Lean bulk mode</strong>
            <p>Meals, macros, and recovery checks tuned to your goal.</p>
          </div>
        </div>
      </section>

      <section className="motivation-strip" aria-label="Training motivation">
        <article className="image-tile lift-image">
          <span>Train Hard</span>
          <strong>Fuel every set with a plan.</strong>
        </article>
        <article className="image-tile meal-image">
          <span>Eat Clean</span>
          <strong>Macros that match your goal.</strong>
        </article>
      </section>
    </>
  );
};
