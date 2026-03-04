const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the uploads directory exists
const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Sanitize filename and prefix with timestamp to avoid collisions
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}-${sanitized}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = /image\/(jpeg|jpg|png|gif|webp)|audio\/(mpeg|mp3|wav|ogg)|video\/(mp4|webm|ogg)/;
    if (allowed.test(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only image, audio, and video files are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});

module.exports = upload;
