import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import AdminDashboard from "./pages/AdminDashboard";
import TeamLogin from "./pages/TeamLogin";
import AdminLogin from "./pages/AdminLogin";
import Leaderboard from "./pages/Leaderboard";
import Clue from "./pages/Clue";

import "./styles/theme.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TeamLogin />} />
        <Route path="/login" element={<TeamLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scan" element={<Clue />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;