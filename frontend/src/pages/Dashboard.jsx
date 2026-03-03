import { useEffect, useState, useRef, useCallback } from "react";
import API from "../services/api";
import Timer from "../components/Timer";

/* ── Countdown hook — ticks every second ────────────────── */
function useCountdown(gameStartTime, timeLimit) {
    const [remaining, setRemaining] = useState(null);
    useEffect(() => {
        if (!gameStartTime || !timeLimit) { setRemaining(null); return; }
        const tick = () => {
            const r = new Date(gameStartTime).getTime() + timeLimit - Date.now();
            setRemaining(r > 0 ? r : 0);
        };
        tick();
        const iv = setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, [gameStartTime, timeLimit]);
    return remaining;
}

/* ── Format ms → HH:MM:SS ───────────────────────────────── */
function fmtCountdown(ms) {
    if (ms === null) return "--:--:--";
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Dashboard() {
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timesUp, setTimesUp] = useState(false);
    const teamRef = useRef(null);
    const redirectedRef = useRef(false);

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                const res = await API.get("/game/status");
                teamRef.current = res.data;
                setTeam(res.data);
                setLoading(false);
                setError("");
                // Server says time expired → redirect
                if (res.data.timeExpired && !redirectedRef.current) {
                    redirectedRef.current = true;
                    setTimesUp(true);
                    setTimeout(() => { window.location.href = "/leaderboard"; }, 3000);
                }
            } catch {
                if (!teamRef.current) {
                    setError("Failed to connect. Please log in again.");
                    setLoading(false);
                }
            }
        };
        fetchTeamData();
        const interval = setInterval(fetchTeamData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Derive countdown from team data
    const remaining = useCountdown(team?.gameStartTime, team?.timeLimit);

    // When client-side countdown hits 0, show overlay + redirect
    useEffect(() => {
        if (remaining === 0 && !redirectedRef.current && team?.gameStarted) {
            redirectedRef.current = true;
            setTimesUp(true);
            setTimeout(() => { window.location.href = "/leaderboard"; }, 3000);
        }
    }, [remaining, team?.gameStarted]);

    /* ── loading / error states ─────────────────────────── */
    if (loading) return (
        <div className="full-center">
            <div className="dash-team-name" style={{ fontSize: 26, animation: "flicker 1.5s infinite" }}>LOADING...</div>
        </div>
    );

    if (error) return (
        <div className="full-center">
            <div className="dash-team-name" style={{ fontSize: 24 }}>⚠ CONNECTION LOST</div>
            <p className="text-dim">{error}</p>
            <a href="/login" className="back-link">← Return to Login</a>
        </div>
    );

    if (!team) return (
        <div className="full-center">
            <p className="text-red">No team data found.</p>
            <a href="/login" className="back-link">← Return to Login</a>
        </div>
    );

    /* ── TIME'S UP overlay ───────────────────────────────── */
    if (timesUp) return (
        <div className="full-center" style={{ background: "radial-gradient(circle,#0d0d0d,#000)", gap: 20 }}>
            <div style={{ fontFamily: "'Creepster', cursive", fontSize: 52, color: "#ff0000", textShadow: "0 0 30px #ff0000", animation: "flicker 0.8s infinite" }}>⏰ TIME'S UP!</div>
            <div style={{ color: "#888", fontSize: 14, letterSpacing: 3 }}>3 HOURS HAVE ELAPSED</div>
            <div style={{ color: "#555", fontSize: 12, letterSpacing: 2, marginTop: 8 }}>Redirecting to leaderboard...</div>
        </div>
    );

    /* ── derived values ─────────────────────────────────── */
    const TOTAL = 10;
    const pipsDone = team.isFinished ? TOTAL : (team.currentIndex ?? 0);
    const clueNum = (team.currentIndex ?? 0) + 1;

    // Determine type by slot: 0,2,4,6=Physical | 1,3,5,7=Technical | 8,9=Final
    const idx = team.currentIndex ?? 0;
    const currentType = idx >= 8 ? "final" : idx % 2 === 0 ? "physical" : "technical";

    const phaseLabel = team.isFinished ? "HUNT COMPLETE"
        : currentType === "final" ? "FINAL STAGE"
            : currentType === "technical" ? "TECHNICAL PHASE" : "PHYSICAL PHASE";
    const phaseColor = team.isFinished ? "#00cc44"
        : currentType === "final" ? "#cc44ff"
            : currentType === "technical" ? "#44aaff" : "#ff6600";

    const pipBg = (i) => {
        const done = i < pipsDone;
        if (i >= 8) return done ? "#cc44ff" : "rgba(200,0,255,0.1)";
        if (i % 2 === 1) return done ? "#44aaff" : "rgba(0,150,255,0.1)";
        return done ? "#ff6600" : "rgba(255,100,0,0.1)";
    };
    const pipGlow = (i) => {
        if (i >= pipsDone) return "none";
        if (i >= 8) return "0 0 8px #cc44ff";
        if (i % 2 === 1) return "0 0 8px #44aaff";
        return "0 0 8px #ff6600";
    };

    const formatTime = (ms) => {
        if (!ms) return null;
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    const clueText = team.currentClue?.question || team.currentClue?.description || null;
    const clueHint = team.currentClue?.hint || null;
    const clueType = team.currentClue?.type || currentType;

    // Countdown colors
    const cdPct = remaining !== null && team.timeLimit ? remaining / team.timeLimit : 1;
    const cdColor = cdPct > 0.25 ? "#00cc44" : cdPct > 0.1 ? "#ffcc00" : "#ff2222";

    return (
        <div style={s.page}>

            {/* ══════════ GLOBAL COUNTDOWN BAR ══════════ */}
            {team.gameStarted && !team.isFinished && remaining !== null && (
                <div style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.8)",
                    borderBottom: `1px solid ${cdColor}40`,
                    padding: "10px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    boxSizing: "border-box",
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                }}>
                    <div style={{ fontSize: 9, letterSpacing: 4, color: cdColor, opacity: 0.7, whiteSpace: "nowrap" }}>TIME REMAINING</div>
                    <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                            height: "100%",
                            width: `${cdPct * 100}%`,
                            background: cdColor,
                            boxShadow: `0 0 8px ${cdColor}`,
                            borderRadius: 2,
                            transition: "width 1s linear, background 1s",
                        }} />
                    </div>
                    <div style={{
                        fontFamily: "'Share Tech Mono', monospace",
                        fontSize: 18,
                        color: cdColor,
                        textShadow: `0 0 10px ${cdColor}`,
                        animation: cdPct < 0.1 ? "flicker 0.8s infinite" : "none",
                        whiteSpace: "nowrap",
                        minWidth: 90,
                        textAlign: "right",
                    }}>{fmtCountdown(remaining)}</div>
                </div>
            )}

            {/* ══════════ TOP BAR ══════════ */}
            <div style={s.topBar}>
                {/* Live elapsed timer — prominent, full width at top */}
                {team.startTime && team.currentPhase === "active" ? (
                    <div style={s.timerWrap}>
                        <div style={s.timerLabel}>ELAPSED TIME</div>
                        <Timer startTime={new Date(team.startTime).getTime()} />
                    </div>
                ) : (
                    <div style={s.timerWrap}>
                        <div style={s.timerLabel}>
                            {team.gameStarted ? "TIMER NOT YET RUNNING" : "AWAITING ADMIN START"}
                        </div>
                        <div className="dash-timer" style={{ opacity: 0.3 }}>00:00:00</div>
                    </div>
                )}
            </div>

            {/* ══════════ TEAM IDENTITY STRIP ══════════ */}
            <div style={s.identityRow}>
                <h1 className="dash-team-name" style={{ margin: 0 }}>{team.teamName}</h1>
                <div style={{ ...s.phaseBadge, borderColor: phaseColor, color: phaseColor }}>
                    {phaseLabel}
                </div>
            </div>

            {/* ══════════ PROGRESS STRIP ══════════ */}
            <div style={s.progressWrap}>
                <div style={s.pipRow}>
                    {Array.from({ length: TOTAL }, (_, i) => (
                        <div
                            key={i}
                            title={i >= 8 ? `Final ${i - 7}` : i % 2 === 0 ? `Physical ${Math.floor(i / 2) + 1}` : `Technical ${Math.floor(i / 2) + 1}`}
                            style={{
                                ...s.pip,
                                background: pipBg(i),
                                boxShadow: pipGlow(i),
                                marginRight: i === 7 ? 14 : 4, // gap before Final pips
                            }}
                        />
                    ))}
                </div>
                <div style={s.pipLabels}>
                    <span style={{ color: "#ff6600", fontSize: 10, letterSpacing: 2 }}>● PHYSICAL</span>
                    <span style={{ color: "#44aaff", fontSize: 10, letterSpacing: 2 }}>● TECHNICAL</span>
                    <span style={{ color: "#cc44ff", fontSize: 10, letterSpacing: 2 }}>● FINAL</span>
                </div>
                <div style={{ fontSize: 12, color: "#555", letterSpacing: 2, marginTop: 4 }}>
                    {pipsDone} / {TOTAL} CLUES SOLVED
                </div>
            </div>

            {/* ══════════ STATS ROW ══════════ */}
            <div style={s.statsRow}>
                <StatCard label="CLUE" value={team.isFinished ? "—" : `${clueNum} / ${TOTAL}`} />
                <StatCard label="WRONG ATTEMPTS" value={team.wrongAttempts ?? 0} warn={team.wrongAttempts > 0} />
                <StatCard label="TYPE" value={team.isFinished ? "DONE" : clueType.toUpperCase()} color={phaseColor} />
                {team.isFinished && team.totalTime && (
                    <StatCard label="FINAL TIME" value={formatTime(team.totalTime)} color="#00cc44" />
                )}
            </div>

            {/* ══════════ STATUS ALERTS ══════════ */}

            {/* ── WAITING FOR ADMIN TO START ── */}
            {!team.gameStarted && !team.isFinished && (
                <div style={{
                    ...s.alertBox,
                    borderColor: "#00aa44",
                    background: "rgba(0,40,20,0.7)",
                    maxWidth: 560,
                    animation: "fadeInUp 0.5s ease",
                }}>
                    <div style={{ ...s.alertTitle, color: "#00cc55", fontSize: 22 }}>
                        ⏳ WAITING FOR ADMIN
                    </div>
                    <div style={s.alertSub}>
                        The game has not started yet. Stand by — the admin will fire the start signal.
                    </div>
                    <div style={{
                        marginTop: 16,
                        display: "flex",
                        gap: 8,
                        justifyContent: "center",
                    }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width: 8, height: 8, borderRadius: "50%",
                                background: "#00cc55",
                                opacity: 0.6,
                                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                            }} />
                        ))}
                    </div>
                </div>
            )}

            {team.isLocked && (
                <div style={{ ...s.alertBox, borderColor: "#ff0000", background: "rgba(80,0,0,0.5)" }}>
                    <div style={s.alertTitle}>⚠ TEAM LOCKED</div>
                    <div style={s.alertSub}>Please wait for admin to unlock you before scanning.</div>
                </div>
            )}

            {team.eventPaused && !team.isLocked && (
                <div style={{ ...s.alertBox, borderColor: "#ffcc00", background: "rgba(40,40,0,0.5)" }}>
                    <div style={{ ...s.alertTitle, color: "#ffcc00" }}>⏸ EVENT PAUSED</div>
                    <div style={s.alertSub}>The game has been temporarily stopped by admin.</div>
                </div>
            )}

            {team.isFinished && (
                <div style={{ ...s.alertBox, borderColor: "#00cc44", background: "rgba(0,60,0,0.5)", maxWidth: 600 }}>
                    <div style={{ ...s.alertTitle, color: "#00cc44" }}>🎉 HUNT COMPLETE!</div>
                    <div style={s.alertSub}>Congratulations! Check the leaderboard for your ranking.</div>
                </div>
            )}

            {/* ══════════ CLUE CARD ══════════ */}
            {!team.isFinished && !team.isLocked && !team.eventPaused && team.gameStarted && (
                <div style={s.clueCard}>
                    {/* Clue header */}
                    <div style={s.clueHeader}>
                        <span style={s.clueLabel}>— CURRENT CLUE —</span>
                        {clueType && (
                            <span style={{
                                ...s.clueTypeBadge,
                                color: clueType === "final" ? "#cc44ff" : clueType === "technical" ? "#44aaff" : "#ff6600",
                                borderColor: clueType === "final" ? "#cc44ff" : clueType === "technical" ? "#44aaff" : "#ff6600",
                            }}>
                                {clueType.toUpperCase()}
                            </span>
                        )}
                    </div>

                    {/* Clue text */}
                    {clueText ? (
                        <p style={s.clueText}>{clueText}</p>
                    ) : (
                        <p style={{ ...s.clueText, opacity: 0.4, fontStyle: "italic" }}>
                            No clue assigned yet. Start the game or wait for admin.
                        </p>
                    )}

                    {/* Hint section */}
                    {clueHint && (
                        <details style={s.hintDetails}>
                            <summary style={s.hintSummary}>💡 SHOW HINT</summary>
                            <p style={s.hintText}>{clueHint}</p>
                        </details>
                    )}

                    {/* Clue number indicator */}
                    <div style={s.clueCounter}>
                        CLUE {clueNum} OF {TOTAL} · {clueType.toUpperCase()} STAGE
                    </div>
                </div>
            )}

            {/* ══════════ ACTION BUTTONS ══════════ */}
            <div style={s.actionRow}>
                {!team.isFinished && !team.isLocked && !team.eventPaused && team.gameStarted && (
                    <button className="dash-scan-btn" onClick={() => window.location.href = "/scan"}>
                        📷 SCAN QR CODE
                    </button>
                )}
                {team.isFinished && (
                    <button className="dash-scan-btn" style={{ borderColor: "#00cc44", color: "#00cc44", boxShadow: "0 0 18px rgba(0,204,68,0.5)" }}
                        onClick={() => window.location.href = "/leaderboard"}>
                        🏆 VIEW LEADERBOARD
                    </button>
                )}
            </div>

            {/* ══════════ FOOTER LINKS ══════════ */}
            <div style={s.footer}>
                <a href="/leaderboard" className="back-link">LEADERBOARD →</a>
                <span style={{ color: "#222", userSelect: "none" }}>·</span>
                <button style={s.logoutBtn} onClick={() => { localStorage.removeItem("token"); window.location.href = "/"; }}>
                    LOGOUT
                </button>
            </div>
        </div>
    );
}

/* ── Stat Card sub-component ────────────────────────────── */
function StatCard({ label, value, warn = false, color }) {
    return (
        <div style={{
            background: "rgba(255,0,0,0.04)",
            border: `1px solid ${warn ? "#ff4400" : "rgba(255,0,0,0.2)"}`,
            borderRadius: 6,
            padding: "12px 18px",
            textAlign: "center",
            minWidth: 90,
            flex: 1,
        }}>
            <div style={{ fontSize: 11, color: "#444", letterSpacing: 3, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, color: color || (warn ? "#ff8800" : "#ff2222"), fontFamily: "'Share Tech Mono', monospace" }}>
                {value}
            </div>
        </div>
    );
}

/* ── Inline styles ──────────────────────────────────────── */
const s = {
    page: {
        minHeight: "100vh",
        background: "radial-gradient(circle at center, #0d0d0d 0%, #000 70%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 20px 40px",
        gap: 0,
        position: "relative",
        zIndex: 1,
    },
    topBar: {
        width: "100%",
        maxWidth: 700,
        borderBottom: "1px solid rgba(255,0,0,0.15)",
        padding: "24px 0 18px",
        textAlign: "center",
        marginBottom: 20,
    },
    timerWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
    timerLabel: { fontSize: 10, letterSpacing: 5, color: "#440000", marginBottom: 4 },

    identityRow: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        marginBottom: 24,
    },
    phaseBadge: {
        display: "inline-block",
        padding: "4px 18px",
        border: "1px solid",
        borderRadius: 20,
        fontSize: 11,
        letterSpacing: 4,
        textTransform: "uppercase",
    },

    progressWrap: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        marginBottom: 24,
        width: "100%",
        maxWidth: 560,
    },
    pipRow: { display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
    pip: { width: 30, height: 9, borderRadius: 5, transition: "background 0.4s, box-shadow 0.4s" },
    pipLabels: { display: "flex", gap: 32, marginTop: 4 },

    statsRow: {
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
        marginBottom: 22,
        width: "100%",
        maxWidth: 600,
    },

    alertBox: {
        border: "1px solid",
        borderRadius: 8,
        padding: "16px 28px",
        textAlign: "center",
        marginBottom: 18,
        width: "100%",
        maxWidth: 560,
    },
    alertTitle: { fontSize: 20, color: "#ff4444", marginBottom: 6, fontFamily: "'Creepster', cursive", letterSpacing: 2 },
    alertSub: { fontSize: 13, color: "#aaa", opacity: 0.85 },

    clueCard: {
        width: "100%",
        maxWidth: 660,
        border: "2px solid rgba(255,0,0,0.5)",
        borderRadius: 10,
        padding: "28px 32px",
        background: "rgba(255,0,0,0.03)",
        boxShadow: "0 0 24px rgba(255,0,0,0.15), inset 0 0 20px rgba(255,0,0,0.03)",
        marginBottom: 24,
        animation: "fadeInUp 0.5s ease",
    },
    clueHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    clueLabel: { fontSize: 10, letterSpacing: 5, color: "#550000" },
    clueTypeBadge: {
        fontSize: 10, letterSpacing: 3, padding: "2px 12px",
        border: "1px solid", borderRadius: 12, textTransform: "uppercase",
    },
    clueText: {
        fontSize: 19,
        lineHeight: 1.75,
        color: "#ff3333",
        textShadow: "0 0 10px rgba(255,0,0,0.3)",
        margin: 0,
        wordBreak: "break-word",
    },
    hintDetails: {
        marginTop: 20,
        borderTop: "1px solid rgba(255,0,0,0.1)",
        paddingTop: 14,
    },
    hintSummary: {
        fontSize: 12,
        letterSpacing: 3,
        color: "#555",
        cursor: "pointer",
        textTransform: "uppercase",
        userSelect: "none",
        listStyle: "none",
    },
    hintText: {
        fontSize: 14,
        color: "#888",
        marginTop: 10,
        lineHeight: 1.6,
        fontStyle: "italic",
    },
    clueCounter: {
        fontSize: 10,
        letterSpacing: 3,
        color: "#333",
        marginTop: 16,
        textAlign: "right",
    },

    actionRow: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        marginBottom: 28,
    },

    footer: {
        display: "flex",
        gap: 20,
        alignItems: "center",
        marginTop: 4,
    },
    logoutBtn: {
        background: "transparent",
        border: "none",
        color: "#330000",
        fontSize: 12,
        letterSpacing: 3,
        cursor: "pointer",
        textTransform: "uppercase",
        padding: 0,
        width: "auto",
        transition: "color 0.2s",
        fontFamily: "'Share Tech Mono', monospace",
    },
};

export default Dashboard;