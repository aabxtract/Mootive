import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import StatusTimeline from "../components/StatusTimeline";
import { NEXT_STATUS } from "../constants";
import { formatDateTime, formatMoney } from "../formatters";
import { useDelivery } from "../hooks/useDelivery";
import { useSession } from "../session";

export default function Tracking() {
  const { id } = useParams();
  const { user, setActiveDeliveryId } = useSession();
  const { delivery, setDelivery, loading, error, refresh } = useDelivery(id);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const nextStatus = NEXT_STATUS[delivery?.status];

  useEffect(() => {
    if (delivery?.status === "Completed") {
      setActiveDeliveryId(null);
    }
  }, [delivery?.status, setActiveDeliveryId]);

  async function advanceStatus() {
    if (!nextStatus) return;
    setActionLoading(true);
    setActionError("");
    try {
      const { delivery: updated } = await api.updateStatus(id, nextStatus);
      setDelivery(updated);
      setActiveDeliveryId(updated.status === "Completed" ? null : updated.id);
    } catch (err) {
      setActionError(err.message || "Could not update status.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <Loader title="Loading tracking..." message="Fetching the current delivery state." />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="screen">
        <BackButton />
        <h1>Track Delivery</h1>
        <div className="error">{error || "Delivery not found."}</div>
      </div>
    );
  }

  const lockedBalance = delivery.payment
    ? delivery.payment.total -
      delivery.payment.releasedOnPickup -
      delivery.payment.releasedOnConfirm
    : 0;
  const isReceiver = user?.receiverTag === delivery.receiverTag || user?.id === delivery.receiverId;

  return (
    <div className="screen">
      <BackButton fallback="/home" />
      <h1>Track Delivery</h1>
      <p className="tagline">
        {delivery.pickup} to {delivery.dropoff} · {delivery.packageType}
      </p>

      <div className="card">
        <div className="li-top">
          <div className="li-title">{delivery.id}</div>
          <span className="pill low">{delivery.status}</span>
        </div>
        <div className="status-note">Created {formatDateTime(delivery.createdAt)}</div>
      </div>

      <div className="card">
        <h2>Status timeline</h2>
        <StatusTimeline
          currentStatus={delivery.status}
          history={delivery.statusHistory}
        />
      </div>

      <div className="card">
        <h2>Delivery details</h2>
        <div className="kv">
          <span className="k">Sender</span>
          <span className="v">{delivery.sender?.name}</span>
        </div>
        <div className="kv">
          <span className="k">Receiver</span>
          <span className="v">
            {delivery.receiverName || delivery.receiverTag || "Awaiting receiver"}
          </span>
        </div>
        <div className="kv">
          <span className="k">Rider</span>
          <span className="v">{delivery.rider?.name || "Not selected"}</span>
        </div>
        <div className="kv">
          <span className="k">Receiver found</span>
          <span className="v">{delivery.receiverFound ? "Yes" : "No"}</span>
        </div>
      </div>

      {delivery.payment ? (
        <div className="card">
          <h2>Payout release</h2>
          <div className="kv">
            <span className="k">Released on pickup</span>
            <span className="v pay-released">
              {formatMoney(delivery.payment.releasedOnPickup)}
            </span>
          </div>
          <div className="kv">
            <span className="k">Released on confirmation</span>
            <span className="v pay-released">
              {formatMoney(delivery.payment.releasedOnConfirm)}
            </span>
          </div>
          <div className="kv">
            <span className="k">Still locked</span>
            <span className="v pay-locked">{formatMoney(lockedBalance)}</span>
          </div>
        </div>
      ) : null}

      {actionError ? <div className="error">{actionError}</div> : null}

      <div className="inline-actions">
        {nextStatus ? (
          <button
            className="btn"
            type="button"
            onClick={advanceStatus}
            disabled={actionLoading}
          >
            {actionLoading ? "Updating..." : `Mark as ${nextStatus}`}
          </button>
        ) : null}

        <button className="btn btn-secondary" type="button" onClick={refresh}>
          Refresh
        </button>
      </div>

      {delivery.status === "Delivered" ? (
        <>
          <div className="card">
            <h2>Receiver action</h2>
            <p className="tagline" style={{ marginBottom: 0 }}>
              Open the receiver view to confirm this delivery and release the
              final 40% payout.
            </p>
          </div>
          <Link
            to={`/incoming/${delivery.id}`}
            className="btn"
            style={{ textDecoration: "none", textAlign: "center" }}
          >
            {isReceiver ? "Confirm as Receiver" : "Open Receiver Confirmation"}
          </Link>
          <Link
            to={`/deliveries/${delivery.id}/dispute`}
            className="btn btn-ghost"
            style={{ textDecoration: "none", textAlign: "center" }}
          >
            Raise Dispute Ticket
          </Link>
        </>
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
