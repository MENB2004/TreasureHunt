// Redirect AdminPanel to the proper admin dashboard
import { useEffect } from "react";

function AdminPanel() {
    useEffect(() => {
        window.location.replace("/admin-dashboard");
    }, []);

    return (
        <div className="full-center">
            <p style={{ fontFamily: "'Share Tech Mono', monospace", color: "#ff2222", letterSpacing: "3px" }}>
                Redirecting...
            </p>
        </div>
    );
}

export default AdminPanel;