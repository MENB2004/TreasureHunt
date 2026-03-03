import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : "http://localhost:5000/api",
});

// Auto-attach team token
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    const adminToken = localStorage.getItem("adminToken");
    // Prefer adminToken for /admin routes, otherwise use team token
    const route = config.url || "";
    if (route.startsWith("/admin") && adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;