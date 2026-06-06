import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import BackButton from "../components/BackButton";
import { PACKAGE_TYPES, URGENCY_OPTIONS } from "../constants";
import { normalizeReceiverTag } from "../formatters";
import { useSession } from "../session";

export default function CreateDelivery() {
  const navigate = useNavigate();
  const { user, setActiveDeliveryId, setCompletionSummary } = useSession();

  const [form, setForm] = useState({
    pickup: "",
    dropoff: "",
    receiverName: "",
    receiverTag: "",
    packageType: "Parcel",
    packageValue: "",
    urgency: "normal",
    note: "",
  });
  const [seedUsers, setSeedUsers] = useState([]);
  const [lookup, setLookup] = useState({ status: "idle", message: "", user: null });
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listUsers()
      .then(({ users }) => setSeedUsers(users.slice(0, 4)))
      .catch(() => {});
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function detectReceiver(tagOverride) {
    const tag = normalizeReceiverTag(tagOverride ?? form.receiverTag);
    if (!tag) {
      setLookup({ status: "idle", message: "", user: null });
      return;
    }

    setLoadingLookup(true);
    setLookup({ status: "loading", message: "", user: null });
    try {
      const { user: foundUser } = await api.findUser(tag);
      updateField("receiverName", foundUser.name || form.receiverName);
      setLookup({
        status: "found",
        message: `${foundUser.name} is registered and will see this as an incoming delivery.`,
        user: foundUser,
      });
    } catch {
      setLookup({
        status: "missing",
        message:
          "Receiver not found in the registry. Mootive will generate a confirmation link for them.",
        user: null,
      });
    } finally {
      setLoadingLookup(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.pickup || !form.dropoff || !form.receiverTag) {
      setError("Pickup, drop-off, and receiver tag are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        senderId: user.id,
        receiverTag: normalizeReceiverTag(form.receiverTag),
        packageValue: Number(form.packageValue) || 0,
      };
      const { delivery } = await api.createDelivery(payload);
      setActiveDeliveryId(delivery.id);
      setCompletionSummary(null);
      navigate(`/delivery/${delivery.id}/riders`);
    } catch (err) {
      setError(err.message || "Could not create delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen">
      <BackButton />
      <h1>Create Delivery</h1>
      <p className="tagline">
        Enter the delivery details and Mootive will find nearby riders and
        recommend the best option.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="pickup">Pickup location</label>
        <input
          id="pickup"
          value={form.pickup}
          onChange={(event) => updateField("pickup", event.target.value)}
          placeholder="e.g. Yaba"
        />

        <label htmlFor="dropoff">Drop-off location</label>
        <input
          id="dropoff"
          value={form.dropoff}
          onChange={(event) => updateField("dropoff", event.target.value)}
          placeholder="e.g. Lekki Phase 1"
        />

        <label htmlFor="receiverTag">Receiver phone / username / tag</label>
        <input
          id="receiverTag"
          value={form.receiverTag}
          onChange={(event) => updateField("receiverTag", event.target.value)}
          onBlur={() => detectReceiver()}
          placeholder="e.g. @amaka"
          autoComplete="off"
        />

        <div className="inline-actions">
          <button
            className="btn btn-secondary btn-inline"
            type="button"
            onClick={() => detectReceiver()}
            disabled={loadingLookup}
          >
            {loadingLookup ? "Checking..." : "Check receiver"}
          </button>
        </div>

        {lookup.status === "found" ? (
          <div className="success" style={{ textAlign: "left" }}>
            <strong>Receiver found.</strong>
            <div className="status-note">{lookup.message}</div>
          </div>
        ) : null}

        {lookup.status === "missing" ? (
          <div className="card" style={{ borderColor: "#f4d7a1" }}>
            <strong>Receiver not found.</strong>
            <div className="status-note">{lookup.message}</div>
          </div>
        ) : null}

        {!!seedUsers.length ? (
          <>
            <div className="section-title">Try a seeded receiver</div>
            <div className="chips">
              {seedUsers.map((seedUser) => (
                <button
                  key={seedUser.id}
                  className="chip"
                  type="button"
                  onClick={() => {
                    const tag = seedUser.receiverTag || seedUser.username || seedUser.phone;
                    updateField("receiverTag", tag);
                    updateField("receiverName", seedUser.name);
                    detectReceiver(tag);
                  }}
                >
                  <strong>{seedUser.receiverTag}</strong> · {seedUser.name}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <label htmlFor="receiverName">Receiver name</label>
        <input
          id="receiverName"
          value={form.receiverName}
          onChange={(event) => updateField("receiverName", event.target.value)}
          placeholder="Optional if the tag already identifies them"
        />

        <label htmlFor="packageType">Package type</label>
        <select
          id="packageType"
          value={form.packageType}
          onChange={(event) => updateField("packageType", event.target.value)}
        >
          {PACKAGE_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label htmlFor="packageValue">Package value (NGN)</label>
        <input
          id="packageValue"
          value={form.packageValue}
          onChange={(event) => updateField("packageValue", event.target.value)}
          inputMode="numeric"
          placeholder="e.g. 60000"
        />

        <label htmlFor="urgency">Delivery urgency</label>
        <select
          id="urgency"
          value={form.urgency}
          onChange={(event) => updateField("urgency", event.target.value)}
        >
          {URGENCY_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label htmlFor="note">Delivery note</label>
        <textarea
          id="note"
          value={form.note}
          onChange={(event) => updateField("note", event.target.value)}
          placeholder="Any extra instructions for the rider or receiver"
        />

        {error ? <div className="error">{error}</div> : null}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Find Nearby Riders"}
        </button>
      </form>
    </div>
  );
}
