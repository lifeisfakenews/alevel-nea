import React, { useEffect, useState } from "react";

import { ThemedText } from "./themed-text";

export default function CountdownTimer({ end_time }: { end_time: number }) {
    const [remaining, setRemaining] = useState(end_time - Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setRemaining(end_time - Date.now());
        }, 1000); // update every second
        return () => clearInterval(interval);
    }, [end_time]);

    return <ThemedText type={formatRemaining(remaining) === "Expired" ? "link" : "default"}>{formatRemaining(remaining)}</ThemedText>;
}

function formatRemaining(remaining: number) {
    if (remaining <= 0) return "Expired";
    const minutes = Math.floor(remaining / 1000 / 60);
    if (minutes < 1) return `${Math.floor(remaining / 1000)} seconds left`;
    return `${minutes} minutes left`;
}