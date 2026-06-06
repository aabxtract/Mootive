import { useSession } from "../session";

/**
 * Phone-frame shell shared by every screen: brand header + logged-in user,
 * with the screen content rendered inside.
 */
export default function AppShell({ children }) {
  const { user, logout } = useSession();

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand">Mootive</span>
        {user ? (
          <span className="who">
            {user.name} ·{" "}
            <button className="link-btn" onClick={logout} type="button">
              logout
            </button>
          </span>
        ) : (
          <span className="who">Fast, reliable deliveries</span>
        )}
      </header>
      {children}
    </div>
  );
}
