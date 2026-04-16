import { Link, Outlet, useNavigate } from "react-router-dom";
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
        <Link className="brand" to="/">NutriAI</Link>
        <nav className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to="/chat">Chat</Link>
              <Link to="/profile">Profile</Link>
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
      <footer className="footer">{user ? `Signed in as ${user.name}` : "NutriAI - AI Nutrition Coach"}</footer>
    </div>
  );
};
