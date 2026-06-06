import { useNavigate } from "react-router-dom";

/**
 * Temporary stub for screens not yet built. Keeps navigation from dead-ending
 * while we build out the remaining 11 screens in flow order.
 */
export default function Placeholder({ title }) {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <h1>{title}</h1>
      <p className="tagline">This screen is coming next. 🚧</p>
      <button className="btn btn-ghost" onClick={() => navigate(-1)}>
        ← Go back
      </button>
    </div>
  );
}
