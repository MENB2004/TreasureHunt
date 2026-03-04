const Clue = require("../models/Clue");
const QRCode = require("qrcode");
const path = require("path");

// ───────────────────────────────────────────────────────────────────────────
// Determine the frontend base URL for QR encoding.
// Priority: FRONTEND_URL env var → fallback to localhost for dev.
// ───────────────────────────────────────────────────────────────────────────
const FRONTEND_BASE = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

// ── UPLOAD MEDIA FILE for a clue (admin only) ─────────────────────────────
// Accepts a multipart file, saves it to /uploads, returns the public URL.
exports.uploadClueMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        // Derive the backend base URL from the request
        const backendBase = process.env.BACKEND_URL
            || `${req.protocol}://${req.get("host")}`;
        const fileUrl = `${backendBase}/uploads/${req.file.filename}`;
        res.json({ url: fileUrl, filename: req.file.filename });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET ALL CLUES
exports.getAllClues = async (req, res) => {
    try {
        const clues = await Clue.find().sort({ type: 1, difficulty: 1 });
        res.json(clues);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE CLUE
exports.createClue = async (req, res) => {
    try {
        const {
            type, question, answer, hint,
            difficulty, qrToken, latitude, longitude, penalty,
            mediaType, mediaUrl,
        } = req.body;

        if (!type || !question || !answer) {
            return res.status(400).json({ message: "type, question and answer are required" });
        }

        const clue = await Clue.create({
            type,
            question,
            answer,
            hint: hint || "",
            difficulty: difficulty || 1,
            qrToken: qrToken || "",
            latitude: latitude || null,
            longitude: longitude || null,
            penalty: penalty || 0,
            mediaType: mediaType || "none",
            mediaUrl: mediaUrl || "",
        });

        res.status(201).json(clue);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE CLUE
exports.updateClue = async (req, res) => {
    try {
        const clue = await Clue.findByIdAndUpdate(
            req.params.clueId,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!clue) return res.status(404).json({ message: "Clue not found" });
        res.json(clue);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE CLUE
exports.deleteClue = async (req, res) => {
    try {
        const clue = await Clue.findByIdAndDelete(req.params.clueId);
        if (!clue) return res.status(404).json({ message: "Clue not found" });
        res.json({ message: "Clue deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GENERATE QR CODE PNG for a clue (admin only) ───────────────────────────
// Returns a PNG image whose QR data is the full scan URL for this website.
exports.generateClueQR = async (req, res) => {
    try {
        const clue = await Clue.findById(req.params.clueId);
        if (!clue) return res.status(404).json({ message: "Clue not found" });

        if (!clue.qrToken) {
            return res.status(400).json({ message: "This clue has no QR token set. Add a qrToken first." });
        }

        // Build the URL that the QR encodes — only works on THIS website
        const scanUrl = `${FRONTEND_BASE}/scan?token=${encodeURIComponent(clue.qrToken)}`;

        // Generate QR as a data-URI string, then write raw PNG bytes to response
        const pngBuffer = await QRCode.toBuffer(scanUrl, {
            errorCorrectionLevel: "H",
            margin: 2,
            width: 400,
            color: { dark: "#ff2222", light: "#000000" },
        });

        res.setHeader("Content-Type", "image/png");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="qr-${clue.qrToken}.png"`
        );
        res.send(pngBuffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET CLUE BY TOKEN (public — used by scan page to auto-reveal answer) ───
// Called when a team's browser lands on /scan?token=<token> via QR scan.
// Returns the full clue (including answer) so the UI can auto-reveal it.
exports.getClueByToken = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ message: "token query param required" });

        const clue = await Clue.findOne({ qrToken: token });
        if (!clue) return res.status(404).json({ message: "Invalid QR token" });

        res.json({
            clueId: clue._id,
            qrToken: clue.qrToken,
            type: clue.type,
            question: clue.question,
            answer: clue.answer,
            hint: clue.hint,
            mediaType: clue.mediaType,
            mediaUrl: clue.mediaUrl,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
