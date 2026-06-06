import { Link, useParams } from "react-router-dom";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import { buildCompletionSummary, formatMoney } from "../formatters";
import { useDelivery } from "../hooks/useDelivery";
import { useSession } from "../session";

export default function CompletedDelivery() {
  const { id } = useParams();
  const { completionSummary } = useSession();
  const { delivery, loading, error } = useDelivery(id);

  const summary =
    completionSummary?.deliveryId === id
      ? completionSummary
      : buildCompletionSummary(delivery);

  if (loading && !summary) {
    return (
      <div className="screen">
        <Loader title="Loading summary..." message="Preparing the completion details." />
      </div>
    );
  }

  if ((!summary && error) || !summary) {
    return (
      <div className="screen">
        <BackButton />
        <h1>Completed Delivery</h1>
        <div className="error">{error || "No completion summary available yet."}</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackButton fallback="/home" />
      <h1>Delivery Completed</h1>
      <p className="tagline">Your package was confirmed by the receiver.</p>

      <div className="success">
        <div className="big">✓</div>
        <strong>Payout fully released</strong>
        <div className="status-note">{summary.message}</div>
      </div>

      <div className="card">
        <div className="kv">
          <span className="k">Delivery ID</span>
          <span className="v">{summary.deliveryId}</span>
        </div>
        <div className="kv">
          <span className="k">Package type</span>
          <span className="v">{summary.packageType}</span>
        </div>
        <div className="kv">
          <span className="k">Rider selected</span>
          <span className="v">{summary.rider}</span>
        </div>
        <div className="kv">
          <span className="k">Receiver</span>
          <span className="v">{summary.receiverName}</span>
        </div>
        <div className="kv">
          <span className="k">Status</span>
          <span className="v">{summary.status}</span>
        </div>
      </div>

      <div className="card">
        <div className="pay-row total">
          <span>Total delivery fee</span>
          <span>{formatMoney(summary.totalDeliveryFee)}</span>
        </div>
        <div className="pay-row">
          <span>Released after pickup</span>
          <span className="pay-released">
            {formatMoney(summary.payoutReleasedAfterPickup)}
          </span>
        </div>
        <div className="pay-row">
          <span>Released after confirmation</span>
          <span className="pay-released">
            {formatMoney(summary.payoutReleasedAfterConfirmation)}
          </span>
        </div>
      </div>

      <Link
        to="/create"
        className="btn"
        style={{ textDecoration: "none", textAlign: "center" }}
      >
        Send Another Package
      </Link>
      <Link
        to="/home"
        className="btn btn-secondary"
        style={{ textDecoration: "none", textAlign: "center" }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
