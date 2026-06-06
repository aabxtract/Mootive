import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import RiderCard from "../components/RiderCard";
import { formatMoney, riskTone } from "../formatters";
import { useDelivery } from "../hooks/useDelivery";
import { useSession } from "../session";

export default function RiderSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveDeliveryId } = useSession();
  const { delivery, loading: deliveryLoading, error: deliveryError } = useDelivery(id);
  const [screenLoading, setScreenLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectingId, setSelectingId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setScreenLoading(true);
      try {
        const [response] = await Promise.all([
          api.findRiders(id),
          new Promise((resolve) => setTimeout(resolve, 900)),
        ]);
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load riders.");
      } finally {
        if (!cancelled) setScreenLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSelect(riderId) {
    setSelectingId(riderId);
    setError("");
    try {
      await api.selectRider(id, riderId);
      setActiveDeliveryId(id);
      navigate(`/delivery/${id}/payment`);
    } catch (err) {
      setError(err.message || "Could not select rider.");
    } finally {
      setSelectingId("");
    }
  }

  if (screenLoading || deliveryLoading) {
    return (
      <div className="screen">
        <Loader
          title="Finding nearby riders..."
          message="Scanning the pickup area and ranking the best options."
        />
      </div>
    );
  }

  if (error || deliveryError) {
    return (
      <div className="screen">
        <BackButton />
        <h1>Rider Search</h1>
        <div className="error">{error || deliveryError}</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackButton fallback="/create" />
      <h1>Select a Rider</h1>
      <p className="tagline">
        Delivery from {delivery?.pickup} to {delivery?.dropoff} for{" "}
        {delivery?.receiverName || delivery?.receiverTag}.
      </p>

      {data?.recommendation ? (
        <div className="ai-rec">
          <div className="ai-rec-title">AI recommendation</div>
          <div className="ai-rec-name">{data.recommendation.riderName}</div>
          <p className="ai-rec-why">{data.recommendation.explanation}</p>
        </div>
      ) : null}

      {data?.intelligence ? (
        <div className="card intel">
          <div className="intel-row">
            <span className="label">Fair price range</span>
            <span className="value">
              {formatMoney(data.intelligence.fairPriceRange.low)} -{" "}
              {formatMoney(data.intelligence.fairPriceRange.high)}
            </span>
          </div>
          <div className="intel-row">
            <span className="label">Delivery risk</span>
            <span className={`pill ${riskTone(data.intelligence.deliveryRisk)}`}>
              {data.intelligence.deliveryRisk}
            </span>
          </div>
          <div className="intel-row">
            <span className="label">Estimated delivery time</span>
            <span className="value">{data.intelligence.estimatedDeliveryMins} mins</span>
          </div>
          <div className="intel-row">
            <span className="label">Route note</span>
            <span className="value">{data.intelligence.routeNote}</span>
          </div>
        </div>
      ) : null}

      {error ? <div className="error">{error}</div> : null}

      {data?.riders?.map((rider) => (
        <RiderCard
          key={rider.id}
          rider={rider}
          selected={rider.id === data.recommendation?.riderId}
          selecting={selectingId === rider.id}
          onSelect={() => handleSelect(rider.id)}
        />
      ))}
    </div>
  );
}
