import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const Layout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span>Nutri</span>AI
        </Link>
        <nav className="nav-links">
          {isAuthenticated ? (
            <>
              <NavLink to="/chat" className={({ isActive }) => (isActive ? "active" : undefined)}>Chat</NavLink>
              <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : undefined)}>Profile</NavLink>
              <button type="button" className="ghost-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="solid-btn">Get Started</Link>
            </>
          )}
        </nav>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
      <footer className="footer">{user ? `Signed in as ${user.name}` : "NutriAI - Gym diet and nutrition coach"}</footer>
    </div>
  );
};
