import { formatMoney } from "../formatters";

export default function RiderCard({
  rider,
  onSelect,
  selecting = false,
  selected = false,
}) {
  return (
    <div className={`rider-card ${selected ? "recommended" : ""}`}>
      <div className="rider-top">
        <div className="rider-name">{rider.name}</div>
        <div className="rider-price">{formatMoney(rider.estimatedPrice)}</div>
      </div>

      <div className="rider-meta">
        <span>
          <strong>{rider.trustScore}%</strong> trust
        </span>
        <span>
          <strong>{rider.pickupMins} mins</strong> pickup
        </span>
        <span>
          <strong>{rider.distanceKm} km</strong> away
        </span>
      </div>

      {rider.badges?.length ? (
        <div className="badges">
          {rider.badges.map((badge) => (
            <span key={badge} className={`badge ${badge.toLowerCase()}`}>
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      <button className="btn" type="button" disabled={selecting} onClick={onSelect}>
        {selecting ? "Selecting..." : "Select Rider"}
      </button>
    </div>
  );
}
