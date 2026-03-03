const io = require("socket.io-client");
const socket = io("http://localhost:5000");

socket.on("monitorUpdate", () => {
    console.log("Monitor updated!");
});