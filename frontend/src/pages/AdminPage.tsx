import { useEffect, useState } from "react";
import { api } from "../api/client";

export const AdminPage = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then((response) => setStats(response.data.data));
  }, []);

  if (!stats) {
    return <section className="card"><p>Loading admin dashboard...</p></section>;
  }

  return (
    <section className="card">
      <h2>Admin dashboard</h2>
      <div className="grid-3">
        <article className="metric"><h4>Total Users</h4><p>{stats.total_users}</p></article>
        <article className="metric"><h4>Total Messages</h4><p>{stats.total_messages}</p></article>
        <article className="metric"><h4>Database</h4><p>{stats.db_available ? "Online" : "Offline"}</p></article>
      </div>
    </section>
  );
};
