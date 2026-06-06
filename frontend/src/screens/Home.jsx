import { Link } from "react-router-dom";
import { useSession } from "../session";

export default function Home() {
  const { user, activeDeliveryId, completionSummary } = useSession();

  return (
    <div className="screen">
      <h1>Welcome, {user?.name?.split(" ")[0] || "there"} 👋</h1>
      <p className="tagline">What would you like to do?</p>

      <div className="card">
        <h2 style={{ marginBottom: 4 }}>You're signed in</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Receiver tag: <strong>{user?.receiverTag}</strong>
          <br />
          Phone: {user?.phone || "—"}
        </p>
      </div>

      <Link
        to="/create"
        className="btn"
        style={{ textDecoration: "none", textAlign: "center" }}
      >
        Send a Package
      </Link>
      <Link
        to="/incoming"
        className="btn btn-secondary"
        style={{ textDecoration: "none", textAlign: "center" }}
      >
        View Incoming Deliveries
      </Link>

      {activeDeliveryId ? (
        <Link
          to={`/delivery/${activeDeliveryId}/tracking`}
          className="btn btn-ghost"
          style={{ textDecoration: "none", textAlign: "center" }}
        >
          Track Active Delivery
        </Link>
      ) : null}

      {completionSummary?.deliveryId ? (
        <Link
          to={`/deliveries/${completionSummary.deliveryId}/completed`}
          className="list-item"
        >
          <div className="li-top">
            <span className="li-title">Latest completed delivery</span>
            <span className="pill low">Completed</span>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {completionSummary.packageType} · {completionSummary.rider}
          </p>
        </Link>
      ) : null}
    </div>
  );
}
