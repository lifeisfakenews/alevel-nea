
// Format a date into a string of some format
// Format types:
// relative - A relative timestamp, e.g. 1 minute ago NOTE THIS IS FAIRLY BASIC AS ITS ONLY INTENDED TO BE USED FOR PASS DURATION, SO IT ONLY SHOWS UPTO X HOURS. Also assumes it is in the future
// short_date - Short date string e.g. 22/01/25
// time - Time string e.g. 12:00
// date - Date string e.g. 21 Oct 2025
// date_time - Date and time string e.g. 21 Oct 2025 12:00
export function formatTimestamp(date: Date | number | string, format: "relative" | "short_date" | "time" | "date" | "date_time" | "date_or_time") {
    let parsed_date = new Date(date);
    /* @ts-ignore TS insists that you cant pass a string to isNaN, but it is required here due to the way parseInt handles timestamps (thinks its an int when it isnt) */
    if (typeof date === "number" || !isNaN(date)) {
        parsed_date = new Date(parseInt(date as string));
    };
    /* @ts-ignore TS claims a Date cant equal a string, but it can */
    if (parsed_date === "Invalid Date") return "Invalid Date";

    if (format === "relative") {
        const now = new Date();
        // Math.abs to keep is positive (assume in the future)
        const diff = Math.abs(now.getTime() - parsed_date.getTime());
        const diff_seconds = Math.round(diff / 1000);
        const diff_minutes = Math.round(diff_seconds / 60);
        const diff_hours = Math.round(diff_minutes / 60);

        if (diff_hours > 1) return `in ${diff_hours} hour${diff_hours === 1 ? "" : "s"}`;
        if (diff_minutes > 1) return `in ${diff_minutes} minute${diff_minutes === 1 ? "" : "s"}`;
        if (diff_seconds > 1) return `in ${diff_seconds} second${diff_seconds === 1 ? "" : "s"}`;
        return "now";
    };

    if (format === "date_or_time") {
        format = parsed_date.toDateString() === new Date().toDateString() ? "time" : "date";
    };

    let formatter: Intl.DateTimeFormat | null = null ;
    if (format === "short_date") {
        formatter = new Intl.DateTimeFormat(navigator.language, {
            dateStyle: "short",
        });
    } else if (format === "time") {
        formatter = new Intl.DateTimeFormat(navigator.language, {
            timeStyle: "short",
        });
    } else if (format === "date") {
        formatter = new Intl.DateTimeFormat(navigator.language, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } else if (format === "date_time") {
        formatter = new Intl.DateTimeFormat(navigator.language, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
        });
    };
    if (formatter) return formatter.format(parsed_date);
    return parsed_date.toLocaleString();
};

// takes duration in milliseconds
export function formatDuration(duration2: number) {
    const duration = Math.abs(duration2);
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
    if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
};