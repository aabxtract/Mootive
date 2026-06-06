import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import { formatDateTime } from "../formatters";
import { useSession } from "../session";

export default function IncomingDeliveries() {
  const { user } = useSession();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const lookup = user.receiverTag || user.username || user.phone;
      const { deliveries: inbox } = await api.incoming(lookup);
      setDeliveries(inbox);
    } catch (err) {
      setError(err.message || "Could not load incoming deliveries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="screen">
        <Loader title="Loading inbox..." message="Checking deliveries addressed to you." />
      </div>
    );
  }

  return (
    <div className="screen">
      <BackButton />
      <h1>Incoming Deliveries</h1>
      <p className="tagline">
        Deliveries addressed to {user.receiverTag || user.username || user.phone}.
      </p>

      {error ? <div className="error">{error}</div> : null}

      <button className="btn btn-secondary" type="button" onClick={load}>
        Refresh Inbox
      </button>

      <div className="divider" />

      {!deliveries.length ? (
        <div className="empty">
          <div className="big">📦</div>
          <div>No incoming deliveries yet.</div>
        </div>
      ) : null}

      {deliveries.map((delivery) => {
        const lastEvent =
          delivery.statusHistory?.[delivery.statusHistory.length - 1]?.at || delivery.createdAt;

        return (
          <Link
            key={delivery.id}
            to={`/incoming/${delivery.id}`}
            className="list-item"
          >
            <div className="li-top">
              <span className="li-title">{delivery.packageType}</span>
              <span className="pill low">{delivery.status}</span>
            </div>
            <p className="muted">
              From {delivery.sender?.name} · {delivery.pickup} to {delivery.dropoff}
            </p>
            <div className="status-note">Updated {formatDateTime(lastEvent)}</div>
          </Link>
        );
      })}
    </div>
  );
}
