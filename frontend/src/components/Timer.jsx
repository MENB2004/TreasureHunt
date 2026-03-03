import { useEffect, useState } from "react";

function Timer({ startTime }) {
    const [time, setTime] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const update = () => setTime(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (seconds) => {
        const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
        const s = String(seconds % 60).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    return (
        <div className="dash-timer">
            {formatTime(time)}
        </div>
    );
}

export default Timer;