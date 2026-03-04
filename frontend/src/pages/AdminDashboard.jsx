import { useEffect, useState, useRef } from "react";
import API from "../services/api";

/* ─── helpers ─────────────────────────────────────────────── */
const formatTime = (ms) => {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};
const isLocked = (t) => t.lockedUntil && new Date() < new Date(t.lockedUntil);
const isFinished = (t) => t.currentPhase === "finished";
const progress = (t) => t.currentPhase === "finished" ? 10 : (t.currentIndex ?? 0);


/* ─── MODAL: Add / Edit Team ──────────────────────────────── */
function TeamFormModal({ team, onClose, onSaved }) {
    const [teamName, setTeamName] = useState(team?.teamName || "");
    const [password, setPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true); setErr("");
        try {
            if (team) {
                // Edit existing
                await API.put(`/admin/teams/${team._id}`, { teamName: teamName || undefined, password: password || undefined });
            } else {
                // Create new
                await API.post("/admin/teams/create", { teamName, password });
            }
            onSaved();
        } catch (ex) {
            setErr(ex.response?.data?.message || "Failed to save team");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                <div className="modal-title">{team ? "EDIT TEAM" : "ADD TEAM"}</div>

                <form className="modal-form" onSubmit={submit}>
                    <div className="form-group">
                        <label className="form-label">Team Name</label>
                        <input className="form-input" value={teamName} onChange={e => setTeamName(e.target.value)}
                            placeholder="Enter team name" required={!team} autoComplete="off" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{team ? "New Password (leave blank to keep)" : "Password"}</label>
                        <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                            placeholder={team ? "Leave blank to keep current" : "Enter password"} required={!team} />
                    </div>
                    {err && <p style={{ color: "#ff4444", fontSize: 13 }}>{err}</p>}
                    <div className="modal-actions">
                        <button type="button" className="modal-btn cancel" onClick={onClose}>CANCEL</button>
                        <button type="submit" className="modal-btn" disabled={saving}>{saving ? "SAVING..." : "SAVE"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── MODAL: View Team ─────────────────────────────────────── */
function TeamViewModal({ teamId, onClose }) {
    const [team, setTeam] = useState(null);

    useEffect(() => {
        API.get(`/admin/teams/${teamId}`).then(r => setTeam(r.data)).catch(() => { });
    }, [teamId]);

    if (!team) return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                <div className="modal-title">TEAM DETAILS</div>
                <p className="text-dim">Loading...</p>
            </div>
        </div>
    );

    const rows = [
        ["Team Name", team.teamName],
        ["Current Phase", (team.currentPhase || "—").toUpperCase()],
        ["Clue Index", `${team.currentIndex + 1} / 6`],
        ["Progress", `${progress(team)} / 12`],
        ["Wrong Attempts", team.wrongAttempts],
        ["Start Time", team.startTime ? new Date(team.startTime).toLocaleString() : "Not started"],
        ["Finish Time", team.finishTime ? new Date(team.finishTime).toLocaleString() : "—"],
        ["Total Time", formatTime(team.totalTime)],
        ["Locked", isLocked(team) ? "YES" : "No"],
        ["Location Logs", team.locationLogs?.length || 0],
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                <div className="modal-title">{team.teamName}</div>
                {rows.map(([label, val]) => (
                    <div className="detail-row" key={label}>
                        <span className="detail-label">{label}</span>
                        <span className="detail-value">{String(val)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── MODAL: Confirm (reset / delete) ─────────────────────── */
function ConfirmModal({ title, message, onConfirm, onClose }) {
    const [loading, setLoading] = useState(false);
    const go = async () => { setLoading(true); await onConfirm(); setLoading(false); };
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                <div className="modal-title">{title}</div>
                <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
                <div className="modal-actions">
                    <button className="modal-btn cancel" onClick={onClose}>CANCEL</button>
                    <button className="modal-btn confirm-red" onClick={go} disabled={loading}>
                        {loading ? "WORKING..." : "CONFIRM"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── MODAL: Add / Edit Clue ──────────────────────────────── */
function ClueFormModal({ clue, onClose, onSaved }) {
    const blank = {
        type: "physical", question: "", answer: "", hint: "",
        difficulty: 1, qrToken: "", latitude: "", longitude: "", penalty: 0,
        mediaType: "none", mediaUrl: "",
    };
    const [form, setForm] = useState(clue ? { ...clue } : blank);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    // Media source mode: "url" or "file"
    const [mediaSrc, setMSrc] = useState("url");
    const [uploading, setUping] = useState(false);
    const [uploadErr, setUErr] = useState("");
    const [uploadName, setUName] = useState("");

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    /* Upload a local file to the backend, get back a URL */
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUping(true); setUErr(""); setUName(file.name);
        try {
            const data = new FormData();
            data.append("file", file);
            const adminToken = localStorage.getItem("adminToken");
            const apiBase = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL}/api`
                : "http://localhost:5000/api";
            const res = await fetch(`${apiBase}/admin/clues/upload-media`, {
                method: "POST",
                headers: { Authorization: `Bearer ${adminToken}` },
                body: data,
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.message || `Upload failed (${res.status})`);
            }
            const { url } = await res.json();
            set("mediaUrl", url);
        } catch (ex) {
            setUErr(ex.message);
        } finally {
            setUping(false);
        }
    };

    /* Tab button style helper */
    const tabStyle = (active) => ({
        flex: 1, padding: "6px 0", fontSize: 11, letterSpacing: 2,
        background: active ? "rgba(255,0,0,0.12)" : "transparent",
        border: "1px solid",
        borderColor: active ? "rgba(255,0,0,0.5)" : "rgba(255,255,255,0.08)",
        color: active ? "#ff4444" : "#444",
        cursor: "pointer", borderRadius: 4, transition: "all .15s",
    });

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true); setErr("");
        try {
            const payload = {
                ...form,
                difficulty: Number(form.difficulty),
                penalty: Number(form.penalty),
                latitude: form.latitude ? Number(form.latitude) : null,
                longitude: form.longitude ? Number(form.longitude) : null,
            };
            if (clue) {
                await API.put(`/admin/clues/${clue._id}`, payload);
            } else {
                await API.post("/admin/clues", payload);
            }
            onSaved();
        } catch (ex) {
            setErr(ex.response?.data?.message || "Failed to save clue");
        } finally {
            setSaving(false);
        }
    };

    const field = (label, key, type = "text", placeholder = "") => (
        <div className="form-group" key={key}>
            <label className="form-label">{label}</label>
            <input className="form-input" type={type} value={form[key] || ""} placeholder={placeholder}
                onChange={e => set(key, e.target.value)} autoComplete="off" />
        </div>
    );

    /* Live preview of the attached media */
    const MediaPreview = () => {
        if (!form.mediaUrl || form.mediaType === "none") return null;
        const style = { width: "100%", maxHeight: 160, borderRadius: 6, marginTop: 8, border: "1px solid rgba(255,0,0,0.2)" };
        if (form.mediaType === "image") return <img src={form.mediaUrl} alt="preview" style={style} onError={e => e.target.style.display = "none"} />;
        if (form.mediaType === "audio") return <audio controls src={form.mediaUrl} style={{ width: "100%", marginTop: 8 }} />;
        if (form.mediaType === "video") return <video controls src={form.mediaUrl} style={style} />;
        return null;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                <div className="modal-title">{clue ? "EDIT CLUE" : "ADD CLUE"}</div>

                <form className="modal-form" onSubmit={submit}>
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select className="form-input" value={form.type} onChange={e => set("type", e.target.value)}>
                            <option value="physical">Physical</option>
                            <option value="technical">Technical</option>
                            <option value="final">Final</option>
                        </select>
                    </div>

                    {field("Question / Clue Text", "question", "text", "What is hidden here?")}
                    {field("Answer", "answer", "text", "Correct answer")}
                    {field("Hint (optional)", "hint", "text", "Optional hint")}
                    {field("QR Token (physical)", "qrToken", "text", "Unique token embedded in QR")}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {field("Difficulty (1-5)", "difficulty", "number")}
                        {field("Penalty points", "penalty", "number")}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {field("Latitude", "latitude", "number", "0.000000")}
                        {field("Longitude", "longitude", "number", "0.000000")}
                    </div>

                    {/* ── Media Clue Section ── */}
                    <div style={{ borderTop: "1px solid rgba(255,0,0,0.15)", paddingTop: 16, marginTop: 4 }}>
                        <div style={{ fontSize: 11, letterSpacing: 3, color: "#550000", marginBottom: 12 }}>— MEDIA CLUE (OPTIONAL) —</div>
                        <div className="form-group">
                            <label className="form-label">Media Type</label>
                            <select className="form-input" value={form.mediaType || "none"} onChange={e => set("mediaType", e.target.value)}>
                                <option value="none">None (text only)</option>
                                <option value="image">🖼 Image</option>
                                <option value="audio">🎵 Audio</option>
                                <option value="video">🎬 Video</option>
                            </select>
                        </div>
                        {form.mediaType && form.mediaType !== "none" && (
                            <div className="form-group">
                                {/* URL / Upload toggle tabs */}
                                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                                    <button type="button" style={tabStyle(mediaSrc === "url")}
                                        onClick={() => setMSrc("url")}>🔗 PASTE URL</button>
                                    <button type="button" style={tabStyle(mediaSrc === "file")}
                                        onClick={() => setMSrc("file")}>📁 UPLOAD FILE</button>
                                </div>

                                {mediaSrc === "url" ? (
                                    /* URL input */
                                    <input
                                        className="form-input"
                                        type="url"
                                        placeholder="https://example.com/clue-image.jpg"
                                        value={form.mediaUrl || ""}
                                        onChange={e => set("mediaUrl", e.target.value)}
                                        autoComplete="off"
                                    />
                                ) : (
                                    /* File upload drop zone */
                                    <div>
                                        <label style={{
                                            display: "flex", flexDirection: "column", alignItems: "center",
                                            gap: 8, padding: "18px 12px",
                                            border: "2px dashed rgba(255,0,0,0.3)", borderRadius: 8,
                                            cursor: uploading ? "not-allowed" : "pointer",
                                            background: "rgba(255,0,0,0.02)", transition: "border-color .2s",
                                        }}
                                            onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = "rgba(255,0,0,0.6)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,0,0,0.3)"; }}
                                        >
                                            <span style={{ fontSize: 28 }}>
                                                {form.mediaType === "image" ? "🖼" : form.mediaType === "audio" ? "🎵" : "🎬"}
                                            </span>
                                            <span style={{ fontSize: 12, letterSpacing: 2, color: "#555" }}>
                                                {uploading ? "UPLOADING\u2026" : uploadName || "CLICK TO CHOOSE FILE"}
                                            </span>
                                            <span style={{ fontSize: 10, color: "#333", letterSpacing: 1 }}>
                                                {form.mediaType === "image" ? "JPG, PNG, GIF, WebP" :
                                                    form.mediaType === "audio" ? "MP3, WAV, OGG" : "MP4, WebM, OGG"} · max 100 MB
                                            </span>
                                            <input type="file"
                                                accept={form.mediaType === "image" ? "image/*" : form.mediaType === "audio" ? "audio/*" : "video/*"}
                                                style={{ display: "none" }}
                                                onChange={handleFileChange}
                                                disabled={uploading}
                                            />
                                        </label>
                                        {uploading && <p style={{ fontSize: 11, color: "#ff8800", letterSpacing: 2, marginTop: 6, textAlign: "center", animation: "pulse 1s infinite" }}>⏳ Uploading to server\u2026</p>}
                                        {uploadErr && <p style={{ fontSize: 12, color: "#ff4444", marginTop: 6 }}>✗ {uploadErr}</p>}
                                        {form.mediaUrl && !uploadErr && !uploading && <p style={{ fontSize: 11, color: "#00cc44", letterSpacing: 1, marginTop: 6 }}>✓ File uploaded successfully</p>}
                                    </div>
                                )}

                                <MediaPreview />
                            </div>
                        )}
                    </div>

                    {err && <p style={{ color: "#ff4444", fontSize: 13 }}>{err}</p>}
                    <div className="modal-actions">
                        <button type="button" className="modal-btn cancel" onClick={onClose}>CANCEL</button>
                        <button type="submit" className="modal-btn" disabled={saving || uploading}>{saving ? "SAVING..." : "SAVE CLUE"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── MODAL: View QR Code for a Clue ──────────────────────── */
function QRModal({ clue, onClose }) {
    const [src, setSrc] = useState(null);
    const [err, setErr] = useState("");
    const [loading, setLd] = useState(true);

    useEffect(() => {
        if (!clue) return;
        const token = localStorage.getItem("adminToken");
        const apiBase = import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/api`
            : "http://localhost:5000/api";
        fetch(`${apiBase}/admin/clues/${clue._id}/qr`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async r => {
                if (!r.ok) {
                    const j = await r.json().catch(() => ({}));
                    throw new Error(j.message || `HTTP ${r.status}`);
                }
                const blob = await r.blob();
                setSrc(URL.createObjectURL(blob));
            })
            .catch(e => setErr(e.message))
            .finally(() => setLd(false));
    }, [clue]);

    const download = () => {
        if (!src) return;
        const a = document.createElement("a");
        a.href = src;
        a.download = `qr-${clue.qrToken || clue._id}.png`;
        a.click();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" style={{ maxWidth: 460, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                <div className="modal-title">QR CODE</div>
                <p style={{ color: "#555", fontSize: 12, letterSpacing: 2, marginBottom: 16 }}>
                    {clue.qrToken ? `TOKEN: ${clue.qrToken}` : "No qrToken set on this clue"}
                </p>

                {loading && <p className="text-dim">Generating QR…</p>}
                {err && (
                    <p style={{ color: "#ff4444", fontSize: 13 }}>
                        ✗ {err}
                        {err.includes("no QR token") && " — Set a qrToken in Edit Clue first."}
                    </p>
                )}
                {src && (
                    <>
                        <img
                            src={src}
                            alt="QR Code"
                            style={{
                                width: 280, height: 280,
                                border: "2px solid rgba(255,0,0,0.4)",
                                borderRadius: 8,
                                boxShadow: "0 0 30px rgba(255,0,0,0.2)",
                                display: "block",
                                margin: "0 auto 20px",
                            }}
                        />
                        <p style={{ color: "#444", fontSize: 11, letterSpacing: 2, marginBottom: 16 }}>
                            Scan with phone → auto-reveals answer on the website
                        </p>
                        <div className="modal-actions" style={{ justifyContent: "center" }}>
                            <button className="modal-btn" onClick={download}>⬇ DOWNLOAD PNG</button>
                            <button className="modal-btn cancel" onClick={() => window.print()}>🖨 PRINT</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── TAB: Teams ───────────────────────────────────────────── */
function TeamsTab({ teams, onRefresh, onFlash }) {
    const [modal, setModal] = useState(null); // { type, team? }

    const close = () => setModal(null);
    const saved = () => { close(); onRefresh(); };

    const lockTeam = async (id) => { await API.post(`/admin/lock/${id}`, {}); onRefresh(); onFlash("Team locked ✓"); };
    const unlockTeam = async (id) => { await API.post(`/admin/unlock/${id}`, {}); onRefresh(); onFlash("Team unlocked ✓"); };
    const advanceTeam = async (id) => { await API.post(`/admin/advance/${id}`, {}); onRefresh(); onFlash("Team advanced ✓"); };

    const resetTeam = async (id) => { await API.post(`/admin/teams/${id}/reset`, {}); onRefresh(); onFlash("Team reset ✓"); };
    const deleteTeam = async (id) => { await API.delete(`/admin/teams/${id}`); onRefresh(); onFlash("Team deleted ✓"); };

    return (
        <div>
            <button className="section-add-btn" onClick={() => setModal({ type: "add" })}>
                + ADD TEAM
            </button>

            <div className="team-grid">
                {teams.map((team) => {
                    const locked = isLocked(team);
                    const finished = isFinished(team);
                    const prog = progress(team);
                    const statusClass = finished ? "finished" : locked ? "locked" : "active";
                    const statusLabel = finished ? "FINISHED" : locked ? "LOCKED" : "ACTIVE";

                    return (
                        <div key={team._id} className="team-card">
                            <div className="team-card-name">{team.teamName}</div>

                            <div className="team-card-meta">Phase: <span>{(team.currentPhase || "—").toUpperCase()}</span></div>
                            <div className="team-card-meta">Clue: <span>{team.currentIndex + 1} / 6</span></div>
                            <div className="team-card-meta">Progress: <span>{prog} / 12</span></div>
                            {team.wrongAttempts > 0 && (
                                <div className="team-card-meta">Wrong: <span style={{ color: "#ff8800" }}>{team.wrongAttempts}</span></div>
                            )}

                            {/* Progress bar */}
                            <div style={{ background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.2)", borderRadius: 4, height: 6, margin: "10px 0", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${(prog / 12) * 100}%`, background: "linear-gradient(90deg,#ff0000,#ff4400)", boxShadow: "0 0 6px #ff0000", borderRadius: 4, transition: "width .6s ease" }} />
                            </div>

                            <div className={`team-card-status ${statusClass}`}>{statusLabel}</div>

                            {/* View / Edit / Game controls */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                                <button className="icon-btn blue" onClick={() => setModal({ type: "view", team })}>VIEW</button>
                                <button className="icon-btn orange" onClick={() => setModal({ type: "edit", team })}>EDIT</button>
                                <button className="icon-btn green" onClick={() => advanceTeam(team._id)} disabled={finished} title="Force advance">ADV</button>
                                {locked
                                    ? <button className="icon-btn orange" onClick={() => unlockTeam(team._id)}>UNLOCK</button>
                                    : <button className="icon-btn" onClick={() => lockTeam(team._id)} disabled={finished}>LOCK</button>
                                }
                                <button className="icon-btn" style={{ borderColor: "rgba(255,200,0,0.4)", color: "#ffcc00" }}
                                    onClick={() => setModal({ type: "reset", team })}>RESET</button>
                                <button className="icon-btn" onClick={() => setModal({ type: "delete", team })}>DEL</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {teams.length === 0 && <p className="text-dim" style={{ marginTop: 48, textAlign: "center" }}>No teams yet. Add one above.</p>}

            {/* Modals */}
            {modal?.type === "add" && <TeamFormModal onClose={close} onSaved={saved} />}
            {modal?.type === "edit" && <TeamFormModal team={modal.team} onClose={close} onSaved={saved} />}
            {modal?.type === "view" && <TeamViewModal teamId={modal.team._id} onClose={close} />}
            {modal?.type === "reset" && (
                <ConfirmModal
                    title="RESET TEAM"
                    message={`Reset "${modal.team.teamName}"? This will clear all progress, clue assignments, and location logs. The team can log in and start fresh.`}
                    onConfirm={() => resetTeam(modal.team._id)}
                    onClose={close}
                />
            )}
            {modal?.type === "delete" && (
                <ConfirmModal
                    title="DELETE TEAM"
                    message={`Permanently delete "${modal.team.teamName}"? This cannot be undone.`}
                    onConfirm={() => deleteTeam(modal.team._id)}
                    onClose={close}
                />
            )}
        </div>
    );
}

/* ─── TAB: Clues ───────────────────────────────────────────── */
function CluesTab({ onFlash }) {
    const [clues, setClues] = useState([]);
    const [loading, setLoad] = useState(true);
    const [modal, setModal] = useState(null); // { type:"add"|"edit"|"delete", clue? }
    const [showAnswers, setShowAnswers] = useState(false);

    const load = async () => {
        try { const r = await API.get("/admin/clues"); setClues(r.data); }
        catch { /* ignore */ }
        finally { setLoad(false); }
    };

    useEffect(() => { load(); }, []);

    const close = () => setModal(null);
    const saved = () => { close(); load(); };
    const deleteClue = async (id) => { await API.delete(`/admin/clues/${id}`); load(); onFlash("Clue deleted ✓"); };

    if (loading) return <p className="text-dim" style={{ marginTop: 32, textAlign: "center" }}>Loading clues...</p>;

    const byType = { physical: [], technical: [], final: [] };
    clues.forEach(c => { if (byType[c.type]) byType[c.type].push(c); else byType.physical.push(c); });

    return (
        <div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button className="section-add-btn" style={{ marginBottom: 0 }} onClick={() => setModal({ type: "add" })}>
                    + ADD CLUE
                </button>
                <button className="admin-btn" style={{ marginBottom: 20 }} onClick={() => setShowAnswers(v => !v)}>
                    {showAnswers ? "HIDE ANSWERS" : "SHOW ANSWERS"}
                </button>
                <span className="text-dim" style={{ marginBottom: 20, alignSelf: "center" }}>
                    {clues.length} clue{clues.length !== 1 ? "s" : ""} total
                </span>
            </div>

            {["physical", "technical", "final"].map(type => {
                const list = byType[type];
                if (list.length === 0) return null;
                return (
                    <div key={type} style={{ marginBottom: 36 }}>
                        <div style={{ marginBottom: 10 }}>
                            <span className={`clue-type-badge ${type}`}>{type}</span>
                            <span className="text-dim" style={{ marginLeft: 12 }}>{list.length} clue{list.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="clue-table-wrap">
                            <table className="clue-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Question</th>
                                        <th>{showAnswers ? "Answer" : "Answer ●"}</th>
                                        <th>QR Token</th>
                                        <th>Media</th>
                                        <th>Diff</th>
                                        <th>Hint</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map((c, i) => (
                                        <tr key={c._id}>
                                            <td style={{ color: "#555", fontSize: 12 }}>{i + 1}</td>
                                            <td style={{ maxWidth: 220, color: "#ccc" }}>{c.question}</td>
                                            <td>
                                                {showAnswers
                                                    ? <span style={{ color: "#00cc44" }}>{c.answer}</span>
                                                    : <span className="clue-answer-hidden">hidden</span>
                                                }
                                            </td>
                                            <td style={{ fontSize: 11, color: "#666", maxWidth: 120, wordBreak: "break-all" }}>{c.qrToken || "—"}</td>
                                            <td style={{ textAlign: "center", fontSize: 14 }}>
                                                {c.mediaType === "image" ? "🖼" : c.mediaType === "audio" ? "🎵" : c.mediaType === "video" ? "🎬" : <span style={{ color: "#333" }}>—</span>}
                                            </td>
                                            <td style={{ color: "#ff8800", textAlign: "center" }}>{c.difficulty || 1}</td>
                                            <td style={{ fontSize: 12, color: "#555", maxWidth: 120 }}>{c.hint || "—"}</td>
                                            <td style={{ whiteSpace: "nowrap" }}>
                                                <button className="icon-btn" style={{ borderColor: "rgba(0,180,255,0.4)", color: "#00bbff" }}
                                                    onClick={() => setModal({ type: "qr", clue: c })} title="View/Download QR code">QR</button>
                                                <button className="icon-btn orange" onClick={() => setModal({ type: "edit", clue: c })}>EDIT</button>
                                                <button className="icon-btn" onClick={() => setModal({ type: "delete", clue: c })}>DEL</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {clues.length === 0 && <p className="text-dim" style={{ marginTop: 48, textAlign: "center" }}>No clues yet. Add one above.</p>}

            {modal?.type === "add" && <ClueFormModal onClose={close} onSaved={saved} />}
            {modal?.type === "edit" && <ClueFormModal clue={modal.clue} onClose={close} onSaved={saved} />}
            {modal?.type === "qr" && <QRModal clue={modal.clue} onClose={close} />}
            {modal?.type === "delete" && (
                <ConfirmModal
                    title="DELETE CLUE"
                    message={`Delete this clue? "${modal.clue.question?.slice(0, 60)}..."`}
                    onConfirm={() => deleteClue(modal.clue._id)}
                    onClose={close}
                />
            )}
        </div>
    );
}

/* ─── Countdown for admin panel ─────────────────────────── */
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
function fmtCd(ms) {
    if (ms === null) return "--:--:--";
    const t = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/* ─── MAIN AdminDashboard ──────────────────────────────────── */
function AdminDashboard() {
    const [tab, setTab] = useState("teams"); // "teams" | "clues"
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [eventPaused, setPaused] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameStartTime, setGameStartTime] = useState(null);
    const [timeLimitMs, setTimeLimitMs] = useState(null);
    const [starting, setStarting] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [confirmRestart, setConfirmRestart] = useState(false);
    const [flash, setFlash] = useState("");
    const timerRef = useRef(null);
    const remaining = useCountdown(gameStartTime, timeLimitMs);

    const showFlash = (msg) => {
        setFlash(msg);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setFlash(""), 2500);
    };

    const loadTeams = async () => {
        try {
            const r = await API.get("/admin/teams");
            setTeams(r.data);
            setLoading(false);
            const anyStarted = r.data.some(t => t.currentPhase === "active" || t.currentPhase === "finished");
            if (anyStarted) setGameStarted(true);
        } catch { /* ignore */ }
    };

    const loadEventStatus = async () => {
        try {
            const r = await API.get("/admin/event-status");
            if (r.data.gameStarted) {
                setGameStarted(true);
                setGameStartTime(r.data.gameStartTime);
                setTimeLimitMs(r.data.timeLimit);
            }
        } catch { /* ignore */ }
    };

    useEffect(() => {
        loadTeams();
        loadEventStatus();
        const iv = setInterval(() => { loadTeams(); loadEventStatus(); }, 6000);
        return () => { clearInterval(iv); clearTimeout(timerRef.current); };
    }, []);

    const toggleEvent = async () => {
        try {
            await API.post(eventPaused ? "/admin/resume" : "/admin/pause", {});
            setPaused(!eventPaused);
            showFlash(eventPaused ? "Event resumed ✓" : "Event paused ✓");
        } catch { showFlash("Failed to toggle event ✗"); }
    };

    const startAllGame = async () => {
        setStarting(true);
        try {
            const r = await API.post("/admin/start-all", {});
            setGameStarted(true);
            showFlash(`🚀 ${r.data.message}`);
            await loadEventStatus();
            loadTeams();
        } catch (err) {
            showFlash(err.response?.data?.message || "Failed to start game ✗");
        } finally {
            setStarting(false);
        }
    };

    const restartGame = async () => {
        setConfirmRestart(false);
        setRestarting(true);
        try {
            const r = await API.post("/admin/reset-all", {});
            setGameStarted(false);
            setGameStartTime(null);
            setTimeLimitMs(null);
            setPaused(false);
            showFlash(`🔄 ${r.data.message}`);
            loadTeams();
        } catch (err) {
            showFlash(err.response?.data?.message || "Failed to restart game ✗");
        } finally {
            setRestarting(false);
        }
    };

    const logout = () => { localStorage.removeItem("adminToken"); window.location.href = "/admin/login"; };

    if (loading) return (
        <div className="full-center">
            <div style={{ fontFamily: "'Creepster', cursive", fontSize: 28, color: "#ff1a1a", animation: "flicker 1.5s infinite" }}>
                LOADING CONTROL ROOM...
            </div>
        </div>
    );

    const stats = [
        { label: "TOTAL", val: teams.length },
        { label: "WAITING", val: teams.filter(t => t.currentPhase === "waiting").length },
        { label: "ACTIVE", val: teams.filter(t => !isFinished(t) && !isLocked(t) && t.currentPhase !== "waiting").length },
        { label: "LOCKED", val: teams.filter(t => isLocked(t)).length },
        { label: "FINISHED", val: teams.filter(t => isFinished(t)).length },
    ];

    return (
        <div className="admin-page">
            {/* Header */}
            <div className="admin-header">
                <h1 className="admin-title">⚙ CONTROL ROOM</h1>
                <div className="admin-controls">
                    {flash && <span style={{ fontSize: 12, color: "#00cc44", letterSpacing: 2, alignSelf: "center" }}>{flash}</span>}
                    {/* ── START GAME button ── */}
                    {!gameStarted ? (
                        <button
                            className="admin-btn"
                            style={{
                                background: starting ? "#112211" : "linear-gradient(135deg, #003300, #005500)",
                                border: "1px solid #00cc44",
                                color: starting ? "#336633" : "#00ff66",
                                boxShadow: starting ? "none" : "0 0 12px rgba(0,255,102,0.4)",
                                fontWeight: "bold",
                                minWidth: 130,
                                transition: "all .2s",
                            }}
                            onClick={startAllGame}
                            disabled={starting}
                        >
                            {starting ? "STARTING..." : "▶ START GAME"}
                        </button>
                    ) : (
                        <button
                            className="admin-btn"
                            style={{
                                background: "#0d1a0d",
                                border: "1px solid #336633",
                                color: "#336633",
                                cursor: "default",
                                minWidth: 130,
                            }}
                            disabled
                        >
                            GAME STARTED ✓
                        </button>
                    )}
                    {/* ── Countdown display after game start ── */}
                    {gameStarted && remaining !== null && (
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "6px 14px",
                            border: `1px solid ${remaining === 0 ? "#ff0000" :
                                remaining / timeLimitMs > 0.25 ? "rgba(0,204,68,0.4)" :
                                    remaining / timeLimitMs > 0.1 ? "rgba(255,204,0,0.4)" : "rgba(255,0,0,0.6)"
                                }`,
                            borderRadius: 4,
                            background: "rgba(0,0,0,0.3)",
                            minWidth: 120,
                        }}>
                            <div style={{ fontSize: 8, letterSpacing: 3, color: "#555", marginBottom: 2 }}>
                                {remaining === 0 ? "GAME OVER" : "TIME REMAINING"}
                            </div>
                            <div style={{
                                fontFamily: "'Share Tech Mono', monospace",
                                fontSize: 16,
                                color: remaining === 0 ? "#ff0000" :
                                    remaining / timeLimitMs > 0.25 ? "#00cc44" :
                                        remaining / timeLimitMs > 0.1 ? "#ffcc00" : "#ff4444",
                                animation: remaining !== null && remaining / timeLimitMs < 0.1 ? "flicker 0.8s infinite" : "none",
                            }}>
                                {fmtCd(remaining)}
                            </div>
                        </div>
                    )}
                    <button className={`admin-btn ${eventPaused ? "success" : "danger"}`} onClick={toggleEvent}>
                        {eventPaused ? "▶ RESUME" : "⏸ PAUSE"}
                    </button>
                    {/* ── RESTART GAME button — always visible after game started ── */}
                    {gameStarted && (
                        <button
                            className="admin-btn danger"
                            style={{
                                background: restarting ? "#1a0000" : "rgba(180,0,0,0.12)",
                                border: "1px solid #cc0000",
                                color: restarting ? "#660000" : "#ff4444",
                                minWidth: 130,
                                fontWeight: "bold",
                            }}
                            onClick={() => setConfirmRestart(true)}
                            disabled={restarting}
                        >
                            {restarting ? "RESTARTING..." : "🔄 RESTART GAME"}
                        </button>
                    )}
                    <a href="/leaderboard" className="admin-btn" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>LEADERBOARD</a>
                    <button className="admin-btn danger" onClick={logout}>LOGOUT</button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                {stats.map(({ label, val }) => (
                    <div key={label} style={{ background: "#0e0e0e", border: "1px solid rgba(255,0,0,0.2)", borderRadius: 6, padding: "12px 22px", minWidth: 100, textAlign: "center" }}>
                        <div style={{ fontSize: 26, color: "#ff2222" }}>{val}</div>
                        <div style={{ fontSize: 10, letterSpacing: 3, color: "#444" }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tab-bar">
                <button className={`tab-btn${tab === "teams" ? " active" : ""}`} onClick={() => setTab("teams")}>TEAMS</button>
                <button className={`tab-btn${tab === "clues" ? " active" : ""}`} onClick={() => setTab("clues")}>CLUES</button>
            </div>

            {/* Tab content */}
            {tab === "teams" && <TeamsTab teams={teams} onRefresh={loadTeams} onFlash={showFlash} />}
            {tab === "clues" && <CluesTab onFlash={showFlash} />}

            {/* ── RESTART GAME confirmation modal ── */}
            {confirmRestart && (
                <div className="modal-overlay" onClick={() => setConfirmRestart(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: "center" }}>
                        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
                        <div className="modal-title" style={{ fontSize: 22 }}>RESTART GAME?</div>
                        <p style={{ color: "#888", fontSize: 13, letterSpacing: 1, lineHeight: 1.7, marginBottom: 24 }}>
                            This will <strong style={{ color: "#ff4444" }}>wipe all team progress</strong> — clue sequences, timers, scores, and locations will be cleared.<br />
                            Teams will return to the <strong style={{ color: "#ffcc00" }}>waiting screen</strong>.<br /><br />
                            This <strong style={{ color: "#ff4444" }}>cannot be undone</strong>.
                        </p>
                        <div className="modal-actions" style={{ justifyContent: "center" }}>
                            <button className="modal-btn cancel" onClick={() => setConfirmRestart(false)}>
                                ✕ CANCEL
                            </button>
                            <button className="modal-btn confirm-red" onClick={restartGame}>
                                🔄 YES, RESTART
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;