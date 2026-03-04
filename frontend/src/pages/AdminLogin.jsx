import { useState } from "react";
import API from "../services/api";

function AdminLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post("/admin/login", { username, password });
            localStorage.setItem("adminToken", res.data.token);
            window.location.href = "/admin-dashboard";
        } catch (err) {
            alert(err.response?.data?.message || "Admin login failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1 className="main-title">TREASURE<br />HUNT</h1>
                <div className="logo-group">
                    <img
                        src="/astral.png"
                        alt="ASTRAL '26"
                        className="event-logo"
                        onError={(e) => { e.target.style.display = "none"; }}
                    />
                </div>

                <div className="admin-badge">ADMIN ACCESS</div>

                <form className="login-form" onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="ADMIN USERNAME"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoComplete="off"
                    />
                    <input
                        type="password"
                        placeholder="PASSWORD"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ borderColor: "#ff6600", color: "#ff6600" }}
                    >
                        {loading ? "VERIFYING..." : "ACCESS CONTROL ROOM"}
                    </button>
                </form>

                <div style={{ marginTop: "24px" }}>
                    <a href="/" className="back-link">← Team Login</a>
                </div>
            </div>

            <audio autoPlay loop>
                <source src="/creepy.mp3" type="audio/mpeg" />
            </audio>
        </div>
    );
}

export default AdminLogin;