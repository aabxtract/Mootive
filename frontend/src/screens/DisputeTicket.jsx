import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import { formatDateTime } from "../formatters";
import { useDelivery } from "../hooks/useDelivery";

export default function DisputeTicket() {
  const { id } = useParams();
  const { delivery, loading, error } = useDelivery(id);
  const [reason, setReason] = useState("Receiver has not confirmed delivery.");
  const [ticket, setTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (delivery?.dispute) setTicket(delivery.dispute);
  }, [delivery]);

  async function handleRaise() {
    setSubmitting(true);
    setActionError("");
    try {
      const { ticket: createdTicket } = await api.raiseDispute(id, reason);
      setTicket(createdTicket);
    } catch (err) {
      setActionError(err.message || "Could not raise dispute ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <Loader title="Loading dispute flow..." message="Checking the delivery state." />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="screen">
        <BackButton />
        <h1>Dispute Ticket</h1>
        <div className="error">{error || "Delivery not found."}</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackButton fallback={`/delivery/${id}/tracking`} />
      <h1>Dispute Ticket</h1>
      <p className="tagline">
        Backup scenario for when the receiver fails to confirm delivery.
      </p>

      <div className="card">
        <div className="kv">
          <span className="k">Delivery ID</span>
          <span className="v">{delivery.id}</span>
        </div>
        <div className="kv">
          <span className="k">Rider</span>
          <span className="v">{delivery.rider?.name || "Not assigned"}</span>
        </div>
        <div className="kv">
          <span className="k">Receiver</span>
          <span className="v">{delivery.receiverName || delivery.receiverTag}</span>
        </div>
        <div className="kv">
          <span className="k">Current status</span>
          <span className="v">{delivery.status}</span>
        </div>
      </div>

      {ticket ? (
        <div className="card">
          <h2>Ticket Raised</h2>
          <div className="kv">
            <span className="k">Ticket ID</span>
            <span className="v">{ticket.ticketId}</span>
          </div>
          <div className="kv">
            <span className="k">Status</span>
            <span className="v">{ticket.status}</span>
          </div>
          <div className="kv">
            <span className="k">Reason</span>
            <span className="v">{ticket.reason}</span>
          </div>
          <div className="kv">
            <span className="k">Route record</span>
            <span className="v">{ticket.routeRecord}</span>
          </div>
          <div className="kv">
            <span className="k">Created</span>
            <span className="v">{formatDateTime(ticket.createdAt)}</span>
          </div>
        </div>
      ) : (
        <>
          <label htmlFor="reason">Reason for dispute</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          {actionError ? <div className="error">{actionError}</div> : null}

          <button className="btn" type="button" onClick={handleRaise} disabled={submitting}>
            {submitting ? "Raising..." : "Raise Ticket"}
          </button>
        </>
      )}
    </div>
  );
}
