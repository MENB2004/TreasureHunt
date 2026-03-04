const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded media files at /uploads/<filename>
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const gameRoutes = require("./routes/gameRoutes");
app.use("/api/game", gameRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

app.get("/", (req, res) => {
    res.send("Treasure Hunt API Running");
});

const protect = require("./middleware/authMiddleware");

app.get("/api/test-protected", protect, (req, res) => {
    res.json({
        message: "Protected route working",
        team: req.team
    });
});

const PORT = process.env.PORT || 5000;
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

app.set("io", io);

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});