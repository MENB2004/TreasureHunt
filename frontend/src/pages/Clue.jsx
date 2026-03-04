import { useState, useEffect, useRef, useCallback } from "react";
import API from "../services/api";

/* ── QR Camera Scanner (unchanged) ─────────────────────────── */
function QRScanner({ onScan }) {
    const scannerRef = useRef(null);
    const containerRef = useRef(null);
    const [scanError, setScanError] = useState("");
    const [active, setActive] = useState(false);

    useEffect(() => {
        let html5QrCode;
        const startScanner = async () => {
            try {
                const { Html5Qrcode } = await import("html5-qrcode");
                html5QrCode = new Html5Qrcode("qr-reader");
                scannerRef.current = html5QrCode;
                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        html5QrCode.stop().catch(() => { });
                        onScan(decodedText);
                    },
                    () => { }
                );
                setActive(true);
            } catch {
                setScanError("Camera unavailable. Enter QR token manually below.");
            }
        };
        startScanner();
        return () => { if (scannerRef.current) scannerRef.current.stop().catch(() => { }); };
    }, [onScan]);

    return (
        <div style={{ width: "100%", maxWidth: "320px" }}>
            <div id="qr-reader" ref={containerRef}
                style={{
                    width: "100%", borderRadius: "8px", overflow: "hidden",
                    border: "2px solid rgba(255,0,0,0.5)", background: "#000",
                    minHeight: active ? "auto" : "0",
                }} />
            {scanError && <p style={{ fontSize: "12px", color: "#ff6600", letterSpacing: "1px", marginTop: "8px", textAlign: "center" }}>{scanError}</p>}
        </div>
    );
}

/* ── Auto-reveal card shown when QR is scanned from a URL ───── */
function AnswerRevealCard({ clueData, onSubmit, submitting, submitted }) {
    const typeColors = { physical: "#ff6600", technical: "#44aaff", final: "#cc44ff" };
    const color = typeColors[clueData.type] || "#ff2222";

    return (
        <div style={{
            width: "100%", maxWidth: 560,
            border: `2px solid ${color}`,
            borderRadius: 12,
            padding: "28px 32px",
            background: "rgba(0,0,0,0.6)",
            boxShadow: `0 0 40px ${color}33, 0 0 80px ${color}11`,
            animation: "fadeInUp 0.5s ease",
            textAlign: "center",
        }}>
            {/* Header */}
            <div style={{ fontSize: 10, letterSpacing: 5, color: "#550000", marginBottom: 8 }}>
                — QR CODE SCANNED —
            </div>
            <div style={{
                display: "inline-block",
                padding: "3px 16px",
                border: `1px solid ${color}`,
                borderRadius: 20,
                fontSize: 10,
                letterSpacing: 4,
                color,
                marginBottom: 20,
            }}>
                {(clueData.type || "clue").toUpperCase()}
            </div>



            {/* Media */}
            {clueData.mediaType && clueData.mediaType !== "none" && clueData.mediaUrl && (() => {
                const mu = clueData.mediaUrl;
                const mt = clueData.mediaType;
                if (mt === "image") return (
                    <img src={mu} alt="Clue" style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 8, marginBottom: 20, border: `1px solid ${color}44` }} />
                );
                if (mt === "audio") return (
                    <audio controls src={mu} style={{ width: "100%", marginBottom: 20 }} />
                );
                if (mt === "video") return (
                    <video controls src={mu} style={{ width: "100%", maxHeight: 240, borderRadius: 8, marginBottom: 20 }} />
                );
                return null;
            })()}

            {/* Answer reveal */}
            <div style={{
                borderTop: `1px solid ${color}33`,
                paddingTop: 20,
                marginTop: 4,
            }}>
                <div style={{ fontSize: 10, letterSpacing: 5, color: "#555", marginBottom: 12 }}>ANSWER</div>
                <div style={{
                    fontSize: 32,
                    fontFamily: "'Creepster', cursive",
                    color,
                    textShadow: `0 0 20px ${color}`,
                    letterSpacing: 3,
                    marginBottom: 24,
                    animation: "flicker 2s infinite",
                }}>
                    {clueData.answer}
                </div>
            </div>

            {/* Submit button */}
            {!submitted ? (
                <button
                    className="submit-btn"
                    onClick={onSubmit}
                    disabled={submitting}
                    style={{
                        background: submitting ? "#111" : `linear-gradient(135deg, ${color}22, ${color}44)`,
                        border: `1px solid ${color}`,
                        color,
                        boxShadow: submitting ? "none" : `0 0 20px ${color}33`,
                        fontSize: 14,
                        letterSpacing: 4,
                        padding: "14px 32px",
                        transition: "all .2s",
                    }}
                >
                    {submitting ? "SUBMITTING..." : "✓ SUBMIT & CONTINUE →"}
                </button>
            ) : (
                <div style={{ color: "#00cc44", fontSize: 16, letterSpacing: 3, animation: "pulse 1s infinite" }}>
                    ✓ CORRECT! Moving to next clue…
                </div>
            )}

            {clueData.hint && (
                <details style={{ marginTop: 20, textAlign: "left" }}>
                    <summary style={{ fontSize: 11, letterSpacing: 3, color: "#444", cursor: "pointer", userSelect: "none", listStyle: "none" }}>💡 SHOW HINT</summary>
                    <p style={{ fontSize: 13, color: "#777", marginTop: 8, lineHeight: 1.6, fontStyle: "italic" }}>{clueData.hint}</p>
                </details>
            )}
        </div>
    );
}

/* ── Main Clue / Scan page ──────────────────────────────────── */
function Clue() {
    const [qrToken, setQrToken] = useState("");
    const [answer, setAnswer] = useState("");
    const [message, setMessage] = useState(null); // { text, type }
    const [loading, setLoading] = useState(false);
    const [useCamera, setUseCamera] = useState(false);

    // ── Auto-reveal state (populated when URL has ?token=...) ──
    const [autoClue, setAutoClue] = useState(null);   // clue data from server
    const [autoLoading, setAutoLoad] = useState(false);
    const [autoErr, setAutoErr] = useState("");
    const [autoSubmitting, setAutoSub] = useState(false);
    const [autoSubmitted, setAutoSubd] = useState(false);

    /* On mount: check for ?token= in the URL */
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tok = params.get("token");
        if (!tok) return;

        setQrToken(tok);
        setAutoLoad(true);

        // Fetch full clue (including answer) from the public endpoint
        const apiBase = import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/api`
            : "http://localhost:5000/api";
        fetch(`${apiBase}/game/qr-clue?token=${encodeURIComponent(tok)}`)
            .then(async r => {
                if (!r.ok) {
                    const j = await r.json().catch(() => ({}));
                    throw new Error(j.message || `Error ${r.status}`);
                }
                return r.json();
            })
            .then(data => setAutoClue(data))
            .catch(e => setAutoErr(e.message))
            .finally(() => setAutoLoad(false));
    }, []);

    /* Manual camera scan fills in the token */
    const handleScanSuccess = useCallback((decodedText) => {
        // If the scanned URL is our own site's /scan?token=... URL, extract token
        try {
            const url = new URL(decodedText);
            const tok = url.searchParams.get("token");
            if (tok) {
                // Navigate to our own page so auto-reveal kicks in
                window.location.href = `/scan?token=${encodeURIComponent(tok)}`;
                return;
            }
        } catch { /* not a URL — treat as raw token */ }
        setQrToken(decodedText.trim());
        setUseCamera(false);
    }, []);

    /* Auto-submit: send token + answer to /game/submit on behalf of the team */
    const handleAutoSubmit = async () => {
        if (!autoClue) return;
        setAutoSub(true);
        try {
            await API.post("/game/submit", {
                qrToken: autoClue.qrToken,
                answer: autoClue.answer,
            });
            setAutoSubd(true);
            setTimeout(() => { window.location.href = "/dashboard"; }, 1800);
        } catch (err) {
            const msg = err.response?.data?.message || "Submission failed.";
            setMessage({ text: "✗ " + msg, type: "error" });
            setAutoSub(false);
        }
    };

    /* Manual form submit */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!answer.trim()) return;
        setLoading(true);
        setMessage(null);
        try {
            const res = await API.post("/game/submit", {
                qrToken: qrToken.trim(),
                answer: answer.trim(),
            });
            setMessage({ text: "✓ " + (res.data.message || "Correct! Moving to next clue."), type: "success" });
            setAnswer(""); setQrToken("");
            setTimeout(() => { window.location.href = "/dashboard"; }, 1800);
        } catch (err) {
            const msg = err.response?.data?.message || "Submission failed.";
            setMessage({ text: "✗ " + msg, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    /* ── Render: QR auto-reveal mode ─────────────────────────── */
    const isAutoMode = !!new URLSearchParams(window.location.search).get("token");

    if (isAutoMode) {
        return (
            <div className="scan-page">
                <h1 className="scan-title">📡 QR SCANNED</h1>

                {autoLoading && (
                    <p className="text-dim" style={{ letterSpacing: 3, animation: "pulse 1.2s infinite" }}>
                        Fetching clue…
                    </p>
                )}

                {autoErr && (
                    <div className="msg-box error" style={{ maxWidth: 400 }}>
                        ✗ {autoErr}
                        <br /><span style={{ fontSize: 11, opacity: 0.7 }}>Invalid or unrecognised QR token.</span>
                    </div>
                )}

                {autoClue && (
                    <AnswerRevealCard
                        clueData={autoClue}
                        onSubmit={handleAutoSubmit}
                        submitting={autoSubmitting}
                        submitted={autoSubmitted}
                    />
                )}

                {message && (
                    <div className={`msg-box ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <a href="/dashboard" className="back-link" style={{ marginTop: 24 }}>
                    ← Back to Dashboard
                </a>
            </div>
        );
    }

    /* ── Render: Manual scan / fallback mode ─────────────────── */
    return (
        <div className="scan-page">
            <h1 className="scan-title">📡 SCAN QR</h1>
            <p className="text-dim">Scan the QR code at the clue location, then submit your answer.</p>

            {/* QR Token section */}
            <div className="scan-box">
                {useCamera ? (
                    <QRScanner onScan={handleScanSuccess} />
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <p style={{ fontSize: "12px", color: "#555", letterSpacing: "2px", marginBottom: "4px" }}>
                            QR TOKEN
                        </p>
                        <input
                            className="answer-input"
                            type="text"
                            placeholder="PASTE OR SCAN QR TOKEN"
                            value={qrToken}
                            onChange={(e) => setQrToken(e.target.value)}
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            className="submit-btn"
                            style={{ fontSize: "12px", padding: "10px" }}
                            onClick={() => setUseCamera(true)}
                        >
                            📷 OPEN CAMERA SCANNER
                        </button>
                    </div>
                )}

                {qrToken && !useCamera && (
                    <p style={{ marginTop: "10px", fontSize: "11px", color: "#00cc44", letterSpacing: "2px" }}>
                        ✓ QR TOKEN CAPTURED
                    </p>
                )}
            </div>

            {/* Answer form */}
            <form className="answer-form" onSubmit={handleSubmit}>
                <input
                    className="answer-input"
                    type="text"
                    placeholder="YOUR ANSWER"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    required
                    autoComplete="off"
                />
                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "SUBMITTING..." : "SUBMIT ANSWER"}
                </button>
            </form>

            {message && (
                <div className={`msg-box ${message.type}`}>
                    {message.text}
                </div>
            )}

            <a href="/dashboard" className="back-link" style={{ marginTop: "8px" }}>
                ← Back to Dashboard
            </a>
        </div>
    );
}

export default Clue;
