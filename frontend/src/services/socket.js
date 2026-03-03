import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
    autoConnect: false,
    transports: ["websocket"],
});

export const connectSocket = () => {
    if (!socket.connected) socket.connect();
};

export const disconnectSocket = () => {
    if (socket.connected) socket.disconnect();
};

export default socket;
