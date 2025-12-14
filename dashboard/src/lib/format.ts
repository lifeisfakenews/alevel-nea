/**
 * Formats a timestamp to a relative or absolute date string.
 * @param date The timestamp to format.
 * @param type The type of date format to use. Can be "relative", "date", "time", "date_or_time", "date_and_time".
 * @param date_style The date style to use.
 * @returns The formatted date string.
 * 
 * Relative will format the date relative to the current time, works for both past and future dates. Will show a date if more than a month difference.
 * Time will foramt to HH:MM
 * Date will format to a date, based on the date style.
 * Date or time will give time if today, otherwise date.
 * Date and time will give date and time.
 */

export function formatTimestamp(date: Date | number | string, type: "relative" | "date" | "time" | "date_or_time" | "date_time", date_style: "long" | "medium" | "short" | "full" = "medium") {
    let parsed_date = new Date(date);
    /* @ts-ignore TS insists that you cant pass a string to isNaN, but it is required here due to the way parseInt handles timestamps (thinks its an int when it isnt) */
    if (typeof date === "number" || !isNaN(date)) {
        parsed_date = new Date(parseInt(date as string));
    };
    /* @ts-ignore TS claims a Date cant equal a string, but it can */
    if (parsed_date === "Invalid Date") return "Invalid Date";


    if (type === "relative") {
        const now = new Date();
        const diff = Math.abs(now.getTime() - parsed_date.getTime());
        const isPast = now.getTime() - parsed_date.getTime() > 0;
        
        function grammer_string(strings: TemplateStringsArray, amount?: number) {
            const surround = isPast ? "{{}} ago" : "in {{}}";
            const string_with_plural = amount ? `${amount} ${strings[1]}${amount === 1 ? "" : "s"}` : strings[0];
            return surround.replace("{{}}", string_with_plural);
        };

        const diffSeconds = Math.floor(diff / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths > 1) {
            const formatter = new Intl.DateTimeFormat(navigator.language, {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
            return formatter.format(parsed_date);
        };

        if (12 < diffHours && diffHours < 48) {
            let adjacent = new Date();
            adjacent.setDate(adjacent.getDate() + (isPast ? -1 : 1));
            if (adjacent.getDate() === parsed_date.getDate()) return isPast ? "yesterday" : "tomorrow";
        };

        if (diffWeeks > 3) return grammer_string`a month`;
        if (diffDays > 7) return grammer_string`${diffWeeks} week`;
        if (diffHours > 24) return grammer_string`${diffDays} day`;
        if (diffMinutes > 60) return grammer_string`${diffHours} hour`;
        if (diffSeconds > 60) return grammer_string`${diffMinutes} minute`;
        return "just now";
    };

    if (type === "date_or_time") {
        type = parsed_date.toDateString() === new Date().toDateString() ? "time" : "date";
    };

    let options: Intl.DateTimeFormatOptions = {};
    if (type.includes("date")) {
        options.dateStyle = date_style;
    };
    if (type.includes("time")) {
        options.timeStyle = "short";
    };
    
    const formatter = new Intl.DateTimeFormat(navigator.language, options);
    return formatter.format(parsed_date);
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

export function formatNumber(num:number, decimals = 1) {
    if (typeof num !== 'number' || isNaN(num)) return 'Invalid Number';
    if (num === 0) return '0';
  
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
  
    // Define the abbreviations and their corresponding magnitude
    const abbrev = [
        { value: 1e18, symbol: 'E' }, // Exa
        { value: 1e15, symbol: 'P' }, // Peta
        { value: 1e12, symbol: 'T' }, // Tera
        { value: 1e9, symbol: 'B' },  // Billion
        { value: 1e6, symbol: 'M' },  // Million
        { value: 1e3, symbol: 'k' },  // Thousand
    ];
  
    // Find the appropriate abbreviation
    const item = abbrev.find(item => absNum >= item.value);
    if (!item) return `${num.toLocaleString()}`;
  
    const formattedNum = (absNum / item.value).toFixed(decimals);

    // Remove trailing zeros and decimal point if necessary
    const parts = formattedNum.split('.');
    if (parts.length > 1 && parts[1] === '0') return `${sign}${parts[0]}${item.symbol}`;
    return `${sign}${parseFloat(formattedNum)}${item.symbol}`;
};