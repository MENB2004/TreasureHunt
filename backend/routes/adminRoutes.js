const express = require("express");
const router = express.Router();

const {
    registerAdmin,
    loginAdmin,
    getAllTeams,
    lockTeam,
    unlockTeam,
    advanceTeam,
    pauseEvent,
    resumeEvent,
    getLiveMonitor,
    getMapData,
    startAllTeams,
    getEventStatus,
    resetAllTeams,
    // Team CRUD
    createTeam,
    getTeam,
    updateTeam,
    deleteTeam,
    resetTeam,
} = require("../controllers/adminController");

const {
    getAllClues,
    createClue,
    updateClue,
    deleteClue,
    generateClueQR,
    uploadClueMedia,
} = require("../controllers/clueController");

const upload = require("../middleware/uploadMiddleware");

const protectAdmin = require("../middleware/adminMiddleware");

// ── Auth ──────────────────────────────────────────────────────────────────
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// ── Team Management ───────────────────────────────────────────────────────
router.get("/teams", protectAdmin, getAllTeams);
router.post("/teams/create", protectAdmin, createTeam);
router.get("/teams/:teamId", protectAdmin, getTeam);
router.put("/teams/:teamId", protectAdmin, updateTeam);
router.delete("/teams/:teamId", protectAdmin, deleteTeam);
router.post("/teams/:teamId/reset", protectAdmin, resetTeam);

// ── Team Game Controls ────────────────────────────────────────────────────
router.post("/lock/:teamId", protectAdmin, lockTeam);
router.post("/unlock/:teamId", protectAdmin, unlockTeam);
router.post("/advance/:teamId", protectAdmin, advanceTeam);

// ── Event Controls ────────────────────────────────────────────────────────
router.post("/pause", protectAdmin, pauseEvent);
router.post("/resume", protectAdmin, resumeEvent);
router.post("/start-all", protectAdmin, startAllTeams);
router.post("/reset-all", protectAdmin, resetAllTeams);

// ── Monitor & Map ─────────────────────────────────────────────────────────
router.get("/monitor", protectAdmin, getLiveMonitor);
router.get("/map-data", protectAdmin, getMapData);
router.get("/event-status", getEventStatus); // public — used by team countdown too

// ── Clue Management ───────────────────────────────────────────────────────
router.get("/clues", protectAdmin, getAllClues);
router.post("/clues", protectAdmin, createClue);
router.put("/clues/:clueId", protectAdmin, updateClue);
router.delete("/clues/:clueId", protectAdmin, deleteClue);
// Returns a QR code PNG whose data encodes the frontend scan URL for the clue
router.get("/clues/:clueId/qr", protectAdmin, generateClueQR);
// Upload a local media file; returns { url } pointing at /uploads/<filename>
router.post("/clues/upload-media", protectAdmin, upload.single("file"), uploadClueMedia);

module.exports = router;