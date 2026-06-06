import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSession } from "../session";

/**
 * Fake login / simple profile entry (per the MVP spec — no real auth).
 * Enter name + phone/username -> POST /api/auth/login -> store user -> dashboard.
 * This screen also proves the api.js plumbing end-to-end.
 */
export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useSession();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name && !phone && !username) {
      setError("Enter at least your name or phone number.");
      return;
    }

    setLoading(true);
    try {
      const { user } = await api.login({ name, phone, username });
      setUser(user);
      navigate("/home");
    } catch (err) {
      setError(err.message || "Could not log in. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen center-stack">
      <h1>Mootive</h1>
      <p className="tagline">
        Fast-track your deliveries, reliably and cheaply. Enter a quick profile
        to get started.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Femi Adewale"
          autoComplete="off"
        />

        <label htmlFor="phone">Phone number</label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 08099999999"
          inputMode="tel"
          autoComplete="off"
        />

        <label htmlFor="username">Username (optional)</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. femi"
          autoComplete="off"
        />

        {error && <div className="error">{error}</div>}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Enter Mootive"}
        </button>
        <p className="hint">
          No password needed — this is a simplified profile entry for the MVP.
        </p>
      </form>
    </div>
  );
}
