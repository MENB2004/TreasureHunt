import { useState } from "react";
import API from "../services/api";

function TeamLogin() {
    const [teamName, setTeamName] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post("/auth/login", { teamName, password });
            localStorage.setItem("token", res.data.token);
            window.location.href = "/dashboard";
        } catch (err) {
            alert(err.response?.data?.message || "Login failed. Check your credentials.");
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

                <p className="sub-title">ENTER IF YOU DARE</p>

                <form className="login-form" onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="TEAM NAME"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
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
                    >
                        {loading ? "ENTERING..." : "ENTER THE DARKNESS"}
                    </button>
                </form>

                <div style={{ marginTop: "24px" }}>
                    <a href="/admin/login" className="back-link">Admin Access →</a>
                </div>
            </div>

            <audio autoPlay loop>
                <source src="/creepy.mp3" type="audio/mpeg" />
            </audio>
        </div>
    );
}

export default TeamLogin;