export default function Loader({ title = "Loading...", message = "Please wait." }) {
  return (
    <div className="loader-wrap">
      <div className="loader" />
      <div style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: 6 }}>{title}</h2>
        <p className="tagline" style={{ marginBottom: 0 }}>
          {message}
        </p>
      </div>
    </div>
  );
}
