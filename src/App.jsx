import { Navigate, Route, Routes } from "react-router-dom";

import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import ProtectedRoute from "./admin/ProtectedRoute";

function App() {
  return (
    <Routes>

      {/* PUBLIC WEBSITE */}
      <Route path="/" element={<Home />} />

      {/* ADMIN LOGIN */}
      <Route
        path="/admin/login"
        element={<AdminLogin />}
      />

      {/* PROTECTED ADMIN */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* FALLBACK */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}

function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b12] text-white">
      <div className="text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.4em] text-white/40">
          Website
        </p>

        <h1 className="text-4xl font-light">
          Your Website
        </h1>

        <a
          href="/admin/login"
          className="mt-8 inline-block rounded-full border border-white/10 px-6 py-3 text-sm text-white/70 transition hover:bg-white hover:text-black"
        >
          Admin Login
        </a>
      </div>
    </div>
  );
}

export default App;