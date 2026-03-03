import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

function Leaderboard() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = useCallback(async () => {
        try {
            const res = await API.get("/game/leaderboard");
            setEntries(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 10000);
        return () => clearInterval(interval);
    }, [fetchLeaderboard]);

    const formatTime = (ms) => {
        if (!ms) return "—";
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    const rankStyle = (i) => {
        if (i === 0) return "gold";
        if (i === 1) return "silver";
        if (i === 2) return "bronze";
        return "";
    };

    const rankEmoji = (i) => {
        if (i === 0) return "🥇";
        if (i === 1) return "🥈";
        if (i === 2) return "🥉";
        return `#${i + 1}`;
    };

    if (loading) return (
        <div className="full-center">
            <div style={{ fontFamily: "'Creepster', cursive", fontSize: "28px", color: "#ff1a1a", animation: "flicker 1.5s infinite" }}>
                LOADING LEADERBOARD...
            </div>
        </div>
    );

    return (
        <div className="lb-page">
            <h1 className="lb-title">LEADERBOARD</h1>
            <p className="text-dim" style={{ marginBottom: "28px", letterSpacing: "4px" }}>
                LIVE RANKINGS · AUTO-REFRESHES EVERY 10s
            </p>

            {entries.length === 0 ? (
                <p className="text-dim">No teams have started yet.</p>
            ) : (
                <table className="lb-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>TEAM</th>
                            <th>PROGRESS</th>
                            <th>TIME</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((e, i) => (
                            <tr key={e.teamName}>
                                <td>
                                    <span className={`lb-rank ${rankStyle(i)}`}>
                                        {rankEmoji(i)}
                                    </span>
                                </td>
                                <td style={{ color: "#fff", fontFamily: "'Creepster', cursive", fontSize: "18px", letterSpacing: "2px" }}>
                                    {e.teamName}
                                </td>
                                <td>
                                    <div title={`${e.progress} / 12 clues`}>
                                        <div className="lb-progress-bar">
                                            <div
                                                className="lb-progress-fill"
                                                style={{ width: `${(e.progress / 12) * 100}%` }}
                                            />
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#555", marginTop: "4px", letterSpacing: "1px" }}>
                                            {e.progress} / 12
                                        </div>
                                    </div>
                                </td>
                                <td style={{ color: e.totalTime ? "#00cc44" : "#555" }}>
                                    {formatTime(e.totalTime)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div style={{ marginTop: "36px" }}>
                <a href="/" className="back-link">← Back to Login</a>
            </div>
        </div>
    );
}

export default Leaderboard;
