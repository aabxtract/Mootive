import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import StatusTimeline from "../components/StatusTimeline";
import {
  buildCompletionSummary,
  formatMoney,
} from "../formatters";
import { useDelivery } from "../hooks/useDelivery";
import { useSession } from "../session";

export default function ReceiverDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCompletionSummary, setActiveDeliveryId } = useSession();
  const { delivery, loading, error, setDelivery } = useDelivery(id);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setActionError("");
    try {
      const response = await api.confirmDelivery(id);
      setDelivery(response.delivery);
      setCompletionSummary(response.summary || buildCompletionSummary(response.delivery));
      setActiveDeliveryId(null);
      navigate(`/deliveries/${id}/completed`);
    } catch (err) {
      setActionError(err.message || "Could not confirm delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <Loader title="Opening delivery..." message="Loading receiver details." />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="screen">
        <BackButton fallback="/incoming" />
        <h1>Receiver View</h1>
        <div className="error">{error || "Delivery not found."}</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackButton fallback="/incoming" />
      <h1>Receiver Confirmation</h1>
      <p className="tagline">
        Incoming delivery from {delivery.sender?.name} to{" "}
        {delivery.receiverName || delivery.receiverTag}.
      </p>

      <div className="card">
        <div className="kv">
          <span className="k">Package</span>
          <span className="v">{delivery.packageType}</span>
        </div>
        <div className="kv">
          <span className="k">Rider</span>
          <span className="v">{delivery.rider?.name || "Not assigned yet"}</span>
        </div>
        <div className="kv">
          <span className="k">Status</span>
          <span className="v">{delivery.status}</span>
        </div>
        <div className="kv">
          <span className="k">Delivery fee</span>
          <span className="v">{formatMoney(delivery.payment?.total)}</span>
        </div>
      </div>

      <div className="card">
        <h2>Status timeline</h2>
        <StatusTimeline
          currentStatus={delivery.status}
          history={delivery.statusHistory}
        />
      </div>

      {actionError ? <div className="error">{actionError}</div> : null}

      {delivery.status === "Delivered" ? (
        <button className="btn" type="button" disabled={submitting} onClick={handleConfirm}>
          {submitting ? "Confirming..." : "Confirm Delivery"}
        </button>
      ) : null}

      {delivery.status !== "Delivered" && delivery.status !== "Completed" ? (
        <div className="card">
          <strong>Waiting for the rider.</strong>
          <div className="status-note">
            The receiver can confirm once the status reaches Delivered.
          </div>
        </div>
      ) : null}

      {delivery.status === "Completed" ? (
        <Link
          to={`/deliveries/${delivery.id}/completed`}
          className="btn"
          style={{ textDecoration: "none", textAlign: "center" }}
        >
          View Completion Summary
        </Link>
      ) : null}
    </div>
  );
}
