import { Link, useNavigate, useParams } from "react-router-dom";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import { formatMoney } from "../formatters";
import { useDelivery } from "../hooks/useDelivery";

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { delivery, loading, error } = useDelivery(id);

  if (loading) {
    return (
      <div className="screen">
        <Loader title="Loading payment split..." message="Preparing payout details." />
      </div>
    );
  }

  if (error || !delivery?.payment) {
    return (
      <div className="screen">
        <BackButton />
        <h1>Payment Simulation</h1>
        <div className="error">{error || "Select a rider first."}</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackButton fallback={`/delivery/${id}/riders`} />
      <h1>Payment Simulation</h1>
      <p className="tagline">
        Mootive locks the payout in two stages so the sender, rider, and
        receiver all stay aligned.
      </p>

      <div className="card">
        <div className="pay-row total">
          <span>Delivery fee</span>
          <span>{formatMoney(delivery.payment.total)}</span>
        </div>
        <div className="pay-row">
          <span>
            Released after pickup
            <span className="sub">60% goes to {delivery.rider?.name}</span>
          </span>
          <span className="pay-released">
            {formatMoney(delivery.payment.pickupShare)}
          </span>
        </div>
        <div className="pay-row">
          <span>
            Locked until confirmation
            <span className="sub">40% released after receiver confirms</span>
          </span>
          <span className="pay-locked">
            {formatMoney(delivery.payment.confirmShare)}
          </span>
        </div>
      </div>

      <div className="card">
        <h2>Selected rider</h2>
        <div className="kv">
          <span className="k">Rider</span>
          <span className="v">{delivery.rider?.name}</span>
        </div>
        <div className="kv">
          <span className="k">Pickup time</span>
          <span className="v">{delivery.rider?.pickupMins} mins</span>
        </div>
        <div className="kv">
          <span className="k">Trust score</span>
          <span className="v">{delivery.rider?.trustScore}%</span>
        </div>
      </div>

      <button
        className="btn"
        type="button"
        onClick={() => navigate(`/delivery/${id}/tracking`)}
      >
        Start Delivery Tracking
      </button>

      <Link
        to={`/delivery/${id}/tracking`}
        className="btn btn-secondary"
        style={{ textDecoration: "none", textAlign: "center" }}
      >
        Skip to Tracking
      </Link>
    </div>
  );
}
