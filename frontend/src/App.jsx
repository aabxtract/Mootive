import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { useSession } from "./session";

import Login from "./screens/Login";
import Home from "./screens/Home";
import CreateDelivery from "./screens/CreateDelivery";
import RiderSelection from "./screens/RiderSelection";
import Payment from "./screens/Payment";
import Tracking from "./screens/Tracking";
import IncomingDeliveries from "./screens/IncomingDeliveries";
import ReceiverDelivery from "./screens/ReceiverDelivery";
import CompletedDelivery from "./screens/CompletedDelivery";
import DisputeTicket from "./screens/DisputeTicket";

function RequireUser({ children }) {
  const { user } = useSession();
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/home"
          element={
            <RequireUser>
              <Home />
            </RequireUser>
          }
        />
        <Route
          path="/create"
          element={
            <RequireUser>
              <CreateDelivery />
            </RequireUser>
          }
        />
        <Route
          path="/delivery/:id/riders"
          element={
            <RequireUser>
              <RiderSelection />
            </RequireUser>
          }
        />
        <Route
          path="/delivery/:id/payment"
          element={
            <RequireUser>
              <Payment />
            </RequireUser>
          }
        />
        <Route
          path="/delivery/:id/tracking"
          element={
            <RequireUser>
              <Tracking />
            </RequireUser>
          }
        />
        <Route
          path="/incoming"
          element={
            <RequireUser>
              <IncomingDeliveries />
            </RequireUser>
          }
        />
        <Route
          path="/incoming/:id"
          element={
            <RequireUser>
              <ReceiverDelivery />
            </RequireUser>
          }
        />
        <Route
          path="/deliveries/:id/completed"
          element={
            <RequireUser>
              <CompletedDelivery />
            </RequireUser>
          }
        />
        <Route
          path="/deliveries/:id/dispute"
          element={
            <RequireUser>
              <DisputeTicket />
            </RequireUser>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
