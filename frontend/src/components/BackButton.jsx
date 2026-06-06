import { useNavigate } from "react-router-dom";

export default function BackButton({ fallback = "/home", label = "Back" }) {
  const navigate = useNavigate();

  function handleClick() {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  }

  return (
    <button className="back" type="button" onClick={handleClick}>
      ← {label}
    </button>
  );
}
