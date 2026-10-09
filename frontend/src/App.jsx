import React from "react";
import { Film } from "lucide-react";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AuthPage from "./auth/AuthPage";

function Gate() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="auth-splash" role="status" aria-label="Loading">
        <Film size={36} />
      </div>
    );
  return user ? <CustomerDashboard /> : <AuthPage />;
}

function App() {
  return (
    <div className="cine-app-root">
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </div>
  );
}

export default App;
