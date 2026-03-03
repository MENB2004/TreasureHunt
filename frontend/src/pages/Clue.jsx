import { useState, useEffect, useRef } from "react";
import API from "../services/api";

// Dynamically load html5-qrcode if available; fall back to manual token entry
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
            } catch (err) {
                setScanError("Camera unavailable. Enter QR token manually below.");
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, [onScan]);

    return (
        <div style={{ width: "100%", maxWidth: "320px" }}>
            <div
                id="qr-reader"
                ref={containerRef}
                style={{
                    width: "100%",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "2px solid rgba(255,0,0,0.5)",
                    background: "#000",
                    minHeight: active ? "auto" : "0",
                }}
            />
            {scanError && (
                <p style={{ fontSize: "12px", color: "#ff6600", letterSpacing: "1px", marginTop: "8px", textAlign: "center" }}>
                    {scanError}
                </p>
            )}
        </div>
    );
}

function Clue() {
    const [qrToken, setQrToken] = useState("");
    const [answer, setAnswer] = useState("");
    const [message, setMessage] = useState(null); // { text, type }
    const [loading, setLoading] = useState(false);
    const [useCamera, setUseCamera] = useState(false);

    const handleScanSuccess = (decodedText) => {
        setQrToken(decodedText.trim());
        setUseCamera(false);
    };

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
            setAnswer("");
            setQrToken("");
            // Redirect back to dashboard after short delay
            setTimeout(() => { window.location.href = "/dashboard"; }, 1800);
        } catch (err) {
            const msg = err.response?.data?.message || "Submission failed.";
            setMessage({ text: "✗ " + msg, type: "error" });
        } finally {
            setLoading(false);
        }
    };

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
                <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                >
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
