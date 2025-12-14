//Import required pacakges
import express from "express";
import bcrypt from "bcrypt";
import mongoose, { type PipelineStage } from "mongoose";
import { randomUUID } from "crypto";
import { Expo } from "expo-server-sdk";

const expo = new Expo();

// Import db schemas and types
import { db_users, db_passes, db_restrictions, db_groupings } from "@/schemas";
import type { User, Pass, Restriction, Grouping } from "@/schemas";

import CLASSROOMS from "@/locations/classrooms";
import DESTINATIONS from "@/locations/destinations";

//Define key constants
const ROLE_STUDENT = 0;
const ROLE_TEACHER = 1;
const ROLE_IT = 2;
const ROLE_SENIOR = 3;

const MAX_PASS_DURATION = 10 * 60 * 1000;//10 minutes in ms
const MAX_STUDENTS_FOR_GROUP = 4;

//Env vars
const DB_URL = import.meta.env.DB_URL;
const PORT = import.meta.env.PORT || 3000;
const WEBHOOK_URL = import.meta.env.WEBHOOK_URL;

// Util functions

//handle unhandled promise rejections + uncaught exceptions
function handleError(err: any) {
    log(`${err.message}\n\`\`\`${err.stack}\`\`\``, "error");
};

// Send push notifications to one or more devices
async function sendPushNotification(push_tokens: string[], title: string, body: string, data?: any, category_id?: string) {
    // first map the tokens into an array of notification objects
    const notifications = [];

    for (const token of push_tokens) {
        notifications.push({
            to: token,
            sound: "default",
            title: title,
            body: body,
            data: data,
            channelId: "alerts_attempt_thrice",
            categoryId: category_id,
            priority: "high" as const,
        });
    };

    // check them (expo can send multiple at once but only so many)
    const chunks = expo.chunkPushNotifications(notifications);
    const results = [];
    for (const chunk of chunks) {
        const result = await expo.sendPushNotificationsAsync(chunk);
        results.push(...result);
    };

    const reset = "\x1b[0m";
    const gray = "\x1b[90m";

    console.log(`${gray}Sent ${results.length} push notifications${reset}`);

    return results;
};

// perform required checks for usernames when account is created
async function validateUsername(username: string, edit_user_id?: string) {
    if (!username) return {valid: false, error: "No username provided"};
    if (username.length < 3 || username.length >= 24) return {valid: false, error: "Username must be between 3 and 24 characters"};
    // the regex matches to lower case letters, numbers and dashes
    // if the full string doesnt match then the username contains disallowed characters
    if (!username.match(/^[a-z0-9-]+$/)) return {valid: false, error: "Username can only contain letters, numbers, and dashes"};

    const user = await db_users.findOne({ username });
    if (user && user._id.toString() !== edit_user_id) return {valid: false, error: "Username already taken"};

    return {valid: true, error: null};
};

//perform required checks for passwords when account is created
function validatePassword(password: string) {
    if (!password) return {valid: false, error: "No password provided"};
    if (password.length < 6) return {valid: false, error: "Password must be at least 6 characters"};
    if (!password.match(/[a-z]/)) return {valid: false, error: "Password must contain at least one lowercase letter"};
    if (!password.match(/[A-Z]/)) return {valid: false, error: "Password must contain at least one uppercase letter"};
    if (!password.match(/[0-9]/)) return {valid: false, error: "Password must contain at least one number"};
    //The \W group matches any non-word character (i.e. symbols). _ must also be specified as it is considered a word character
    if (!password.match(/[\W_]/)) return {valid: false, error: "Password must contain at least one special character"};
    return {valid: true, error: null};
};

// checks the proivided authorization header and returns the user if valid, otherwise returns null
async function validateAuthHeader(header?: string) {
    if (!header) return null;
    const [encoded_user_id, session_token] = header.split(".");
    if (!encoded_user_id || !session_token) return null;
    // first decode the user ID from base64 and see if its a real user account
    const user_id = atob(encoded_user_id);
    const user = await db_users.findById(user_id);
    if (!user) return null;
    // then see if a non-expired session with that token exists
    // check against the full header value, not just the token bit
    const session = user.sessions.find(x => x.token === header);
    if (!session) return null;
    if (session.expiry.getTime() < Date.now()) return null;

    return {
        user: user.toObject({ flattenObjectIds: true }),
        session: session,
    };
};

// Check a user's role against a given role(s)
async function checkUserRole(user_or_id: User | string, role: number | number[]) {
    // first get a full user object
    let user: User | null = null;
    if (typeof user_or_id === "string") {
        if (!mongoose.Types.ObjectId.isValid(user_or_id)) return false;
        user = await db_users.findById(user_or_id);
    } else {
        user = user_or_id;
    }
    if (!user) return false;

    // then check the user's role against the given role(s)
    if (Array.isArray(role)) {
        return role.includes(user.role);
    } else {
        return user.role === role;
    }
};

// Check restrictions for pass creation
// boolean indicating if the pass would meet restrictions. True if it would, false if it wouldnt
async function checkRestrictions(user: User, location: string) {

    // get all active global restrictions (TTL = 0 is indefinite)
    const all_restrictions = await db_restrictions.find();
    const active_restrictions = all_restrictions.filter(x => x.ttl === 0 || x.created_at.getTime() + x.ttl > Date.now());

    for (const restriction of active_restrictions) {
        // fetch all passes within the interval, if there is an interval
        let passes_within_interval = await db_passes.find(restriction.interval ? {
            user_id: user._id,
            created_at: {
                $gte: restriction.created_at,
                $lt: restriction.created_at.getTime() + restriction.interval,
            }
        } : {});
        // if a location is specified, filter for that (if it is the destination of the pass) 
        if (restriction.target) {
            if (restriction.target !== location) continue;
            passes_within_interval = passes_within_interval.filter(x => x.destination === location);
        };
        if (passes_within_interval.length >= restriction.amount) return false;
    };

    if (user.restriction_daily) {
        const current_date = new Date();
        current_date.setHours(0, 0, 0, 0);
        const passes_created_today = await db_passes.countDocuments({
            created_by: user._id,
            created_at: {
                $gt: current_date
            }
        });
        if (passes_created_today >= user.restriction_daily) return false;
    };
    if (user.restriction_class) {
        const current_date = new Date();
        // we assume for now that lessons are 1 hour and start on the hour
        current_date.setMinutes(0, 0, 0);
        const passes_created_this_lesson = await db_passes.countDocuments({
            created_by: user._id,
            created_at: {
                $gt: current_date
            }
        });
        if (passes_created_this_lesson >= user.restriction_class) return false;
    };

    return true;
};

const DEBUG_PRINT_GROUP_SCORES = true;
const TXT_RESET = "\x1b[0m";
const TXT_GRAY = "\x1b[90m";
const TXT_AQUA = "\x1b[36m";
const TXT_RED = "\x1b[31m";
const TXT_BOLD = "\x1b[1m";
// threshold to log event must always be <= threshold to send an alert
const THRESHOLD_TO_LOG_EVENT = 50;
const THRESHOLD_TO_SEND_ALERT = 65;
const THRESHOLD_BLOCK_PASSES = 75;

// Check for student grouping and send alerts
// Returns a boolean indicating if pass creation should be blocked
async function checkStudentGrouping(user: User, destination: string, origin: string) {
    // fetch all active passes for the location
    let active_passes = await db_passes.find({ completed_at: { $exists: false }, destination: destination });
    // if the pass is more than an hour late, they probably just forget to complete it
    const ONE_HOUR = 10 * 60 * 60 * 1000;
    active_passes = active_passes.filter(x => x.created_at.getTime() + x.duration + ONE_HOUR > Date.now());

    //fetch all relavent users in one call to save on db calls
    const users = await db_users.find({ _id: { $in: [...active_passes.map(x => x.user_id), user._id] } });

    let confidence_score = 0;
    let involved_students = new Set([user._id]);

    if (DEBUG_PRINT_GROUP_SCORES) {
        console.log(`${TXT_GRAY}Scoring potential grouping for${TXT_RESET} ${TXT_BOLD}${destination}${TXT_RESET}`);
    }
    // for debugging so the score + categories can be logged out easily
    let subtotal = 0;
    function score(amount: number | string) {
        if (typeof amount === "number") {
            subtotal += amount;
            confidence_score += amount;
        } else if (typeof amount === "string") {
            if (DEBUG_PRINT_GROUP_SCORES) console.log(`${TXT_AQUA}${subtotal >= 0 ? "+" : ""}${subtotal}${TXT_RESET} ${TXT_GRAY}for${TXT_RESET} ${amount}`);
            subtotal = 0;
        };
    };

    // First consider active passes in the location
    // +5 for an active pass
    // additonal +5 if the student is in the same year group, the pass is late or they originate from the same classroom
    // +2 if they originate from a nearby but different classroom
    for (const pass of active_passes) {
        score(5);
        involved_students.add(pass.user_id);
        const pass_creator = users.find(x => x.id == pass.user_id.toString())!;
        if (pass_creator.year_group === user.year_group) score(5);
        if (pass.created_at.getTime() + pass.duration < Date.now()) score(5);
        const origin_classroom_of_pass_to_create = CLASSROOMS.find(x => x.name === origin)!;
        const origin_classroom_of_active_pass = CLASSROOMS.find(x => x.name === pass.origin)!;
        if (pass.origin === origin) score(5);
        else if (origin_classroom_of_pass_to_create.location === origin_classroom_of_active_pass.location) score(2);
    };

    score("active passes");

    // Next consider the destination grouping threshold
    // -5 per expected pass in the destination, upto a maximum of -20
    const destination_details = DESTINATIONS.find(x => x.id === destination)!;
    score(-1 * Math.min(5 * destination_details.grouping_threshold, 20));

    score("destination grouping threshold");

    // Now consider the students history of groupings
    // +2 per grouping, ignoring any groupings more than 6 months old
    // additional +2 for every student in the group also in this one, reduced to +1 after the 3rd appearance of the student , +2 if it was in the same location,
    // +3 if the group met the threshold to block passes, +2 if the group met the threshold to send an alert
    const previous_groupings = await db_groupings.find({ students: { $elemMatch: { $eq: user._id } } });
    const student_appearances = new Map<string, number>();
    for (const grouping of previous_groupings) {
        const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;
        if (grouping.created_at.getTime() + SIX_MONTHS < Date.now()) continue;
        score(2);
        for (const student of grouping.students) {
            if (involved_students.has(student)) {
                const appearances = student_appearances.get(student) ?? 0;
                if (appearances <= 3) score(2);
                else score(1);
                student_appearances.set(student, appearances + 1);
            };
        };
        if (grouping.location === destination) score(2);
        if (grouping.confidence_score >= THRESHOLD_TO_SEND_ALERT) score(2);
        if (grouping.confidence_score >= THRESHOLD_BLOCK_PASSES) score(3);
    };

    score("student's history");

    // consider the involved users failed pass attempts
    // +1 for every failed pass attempt by the user, upto +10
    // +1 for every 3 failed pass attempts by other students, upto +5 each
    for (const student_id of involved_students.values()) {
        const student = users.find(x => x._id.toString() == student_id.toString())!;
        if (student.id === user.id) {
            score(Math.min(10, student.failed_pass_attempts!));
        } else {
            const every_three = Math.floor(student.failed_pass_attempts! / 3);
            score(Math.min(5, every_three));
        };
    };

    score("failed pass attempts");

    score(85);
    score("testing grouping detection");

    // Ensure that the confidence score is between 0 and 100
    confidence_score = Math.min(Math.max(confidence_score, 0), 100);

    if (DEBUG_PRINT_GROUP_SCORES) console.log(`${TXT_GRAY}Confidence score:${TXT_RESET} ${TXT_AQUA}${confidence_score}${TXT_RESET}`);

    let grouping:Grouping | null = null;
    if (confidence_score >= THRESHOLD_TO_LOG_EVENT) grouping = await createOrUpdateEvent();
    if (confidence_score >= THRESHOLD_TO_SEND_ALERT) await sendAlert(grouping?.id ?? "");

    if (DEBUG_PRINT_GROUP_SCORES && confidence_score >= THRESHOLD_BLOCK_PASSES) console.log(`${TXT_RED}Restricting pass creation${TXT_RESET}`);

    return confidence_score >= THRESHOLD_BLOCK_PASSES;

    async function sendAlert(grouping_id: string) {
        const on_duty_staff = await db_users.find({ on_duty: true });
        const push_tokens = on_duty_staff.map(x => x.expo_push_token).filter(x => x) as string[];
        if (push_tokens.length > 0) {
            await sendPushNotification(push_tokens, "Student grouping detected", `A group of ${involved_students.size} students has been detected at ${destination} with confidence score ${confidence_score}`, { _id: grouping_id }, "grouping_alert");
        };
    };

    async function createOrUpdateEvent() {
        const existing_grouping = await db_groupings.findOne({ location: destination, resolved_at: { $exists: false } });
        if (existing_grouping) {
            if (DEBUG_PRINT_GROUP_SCORES) console.log(`${TXT_GRAY}Updating existing grouping${TXT_RESET}`);
            const grouping = await db_groupings.findByIdAndUpdate(existing_grouping._id, {
                students: Array.from(involved_students),
                confidence_score: confidence_score,
            }, { new: true });
            return grouping;
        } else {
            if (DEBUG_PRINT_GROUP_SCORES) console.log(`${TXT_GRAY}Creating new grouping${TXT_RESET}`);
            const grouping = await new db_groupings({
                students: Array.from(involved_students),
                location: destination,
                confidence_score: confidence_score,
            }).save();
            return grouping;
        }
    }
};

// general logging function
// logs to stdout and the discord webhook defined in env
async function log(content: string, type: "error" | "reload" | "other" = "other") {
    const log_formats = {
        "error": { color: 0xEA2920, name: "API Error" },
        "reload": { color: 0x37FB70, name: "API Restarted" },
        "other": { color: 0x00B5AE, name: "Other Log Message" },
    }
    const webhook_data = log_formats[type];
    //send a message to the discord webhook
    await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: webhook_data.name,
            avatar_url: `https://resources.votemanager.xyz/assets/logs/${type}.png`,
            embeds: [{
                color: webhook_data.color,
                description: `${content.length > 2000 ? content.slice(0, 1950) + `\n+${content.length - 1950} more characters` : content}`,
            }]
        })
    }).catch(console.log);

    //log to stdout
    console.log(content);
};

// generate random characters of a given length
function randomString(length: number) {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    // for as many times as length, append a random character from ^ to the string
    for (let i = 0; i < length; i++) {
        const index = Math.floor(Math.random() * characters.length);
        result += characters[index];
    }
    return result;
};

// pad out missing dates for chart data
function padMissingDates(data: { label: string, value: number }[], period_start: Date, period_end: Date) {
    const padded_data = [] as { label: string, value: number }[];
    const current_date = new Date(period_start);

    while (current_date <= period_end) {
        const formatted_date = current_date.toISOString().split("T")[0]!;
        const entry = data.find(x => x.label === formatted_date);
        padded_data.push(entry ?? { label: formatted_date, value: 0 });
        current_date.setDate(current_date.getDate() + 1);
    }

    return padded_data;
};


//Connect to the database, if a connection isnt already established
if (!mongoose.connection.readyState) {
    mongoose.connect(DB_URL).then(x => log("Connected to mongoDB", "reload"));
};


//Setup express (web server) on the specified port
const web_server = express();
web_server.listen(PORT, () => {
    log(`Server listening on port ${PORT}`, "reload");
});

web_server.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

web_server.use((req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const end = process.hrtime.bigint();
        const duration_ms = Number(end - start) / 1_000_000;

        const reset = "\x1b[0m";
        const gray = "\x1b[90m";

        let status_color = "\x1b[37m";
        if (res.statusCode >= 500) status_color = "\x1b[31m";
        else if (res.statusCode >= 400) status_color = "\x1b[33m";
        else if (res.statusCode >= 300) status_color = "\x1b[36m";
        else if (res.statusCode >= 200) status_color = "\x1b[32m";
        let status_text = `${status_color}${res.statusCode}${reset}`;

        let method_color = "\x1b[37m";
        if (req.method === "GET") method_color = "\x1b[32m";
        else if (req.method === "POST") method_color = "\x1b[34m";
        else if (req.method === "PUT") method_color = "\x1b[33m";
        else if (req.method === "DELETE") method_color = "\x1b[31m";
        let method_text = `${method_color}${req.method}${reset}`;

        console.log(`${status_text} ${method_text} ${gray}${req.url}${reset} ${duration_ms.toFixed(2)}ms`);
    });

    next();
});

web_server.use(express.json());//parse request bodies into JSON

// Define routes
web_server.get("/", (req, res) => {
    res.send("WOOOOOOOOOOOOOOOOOO NO MORE PROCRASTINATION");
});


// Login. Body requires `username` and `password`.
// Creates a new session and returns the token
web_server.post("/users/login", async(req, res) => {
    try {
        const { username, password } = req.body;
        if (!username) return res.status(400).send("No username provided");
        if (!password) return res.status(400).send("No password provided");
    
        const user = await db_users.findOne({ username });
        if (!user) return res.status(400).send("Invalid username");
    
        const password_match = await bcrypt.compare(password, user.password);
        if (!password_match) return res.status(400).send("Invalid password");
    
        const base64_encoded_user_id = btoa(user.id);
        const token = `${base64_encoded_user_id}.${randomString(32)}`;
        const expiry = Date.now() + (1000 * 60 * 60 * 24 * 7);//7 days from now
        //Create a new session
        user.sessions.push({
            id: randomUUID(),
            token: token,
            expiry: new Date(expiry),
            created_at: new Date(),
        });
        await user.save();
    
        return res.status(200).json({
            success: true,
            data: {
                token: token,
                username: user.username,
                name: user.name,
                role: user.role,
            }
        });
    } catch(e:any) {
        log(`Error on POST \`/users/login\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// create a new user. Body requires `username`, `password`, `name`, and `role`
// Requires senior staff or it staff
web_server.put("/users", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const { username, password, name, role, year_group } = req.body;
        if (!username) return res.status(400).send("No username provided");
        if (!password) return res.status(400).send("No password provided");
        if (!name) return res.status(400).send("No name provided");
        if (role === undefined) return res.status(400).send("No role provided");
        if (role === ROLE_STUDENT && !year_group) return res.status(400).send("No year group provided");

        //make sure the role is a number and exists
        if (isNaN(role)) return res.status(400).send("Invalid role");
        if (role < 0 || role > 3) return res.status(400).send("Invalid role");

        const username_valid = await validateUsername(username);
        if (!username_valid.valid) return res.status(400).send(username_valid.error);

        const password_valid = validatePassword(password);
        if (!password_valid.valid) return res.status(400).send(password_valid.error);
    
        // hash the password with 10 rounds of salt
        const hashed_password = await bcrypt.hash(password, 10);
        const new_user = await new db_users({
            username: username,
            password: hashed_password,
            name: name,
            role: role,
            year_group: year_group,
        }).save();

        return res.status(201).json({
            success: true,
            data: new_user,
        });
    } catch(e: any) {
        log(`Error on PUT \`/users\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// Create many users. Body takes an array of objects with `username`, `password`, `name`, and `role`
// used by the staff dashboard. Requires senior staff or it staff
web_server.put("/users/bulk", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const { users } = req.body;
        if (!users) return res.status(400).send("No users provided");
        if (!Array.isArray(users)) return res.status(400).send("Must provide an array of user details");
    
        type UserDetailError = {
            index: number;
            field: "username" | "password" | "name" | "role" | "year_group";
            error: string | null;
        }

        const created_users:User[] = [];
        const errors:UserDetailError[] = [];

        // iterate through each user
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            let is_valid = true;

            // do the validation checks
            if (!user.username) {
                errors.push({ index: i, field: "username", error: "No username provided" });
                is_valid = false;
            } else {
                const username_valid = await validateUsername(user.username);
                if (!username_valid.valid) {
                    errors.push({index: i, field: "username", error: username_valid.error });
                    is_valid = false;
                };
            };

            if (!user.password) {
                errors.push({ index: i, field: "password", error: "No password provided" });
                is_valid = false;
            } else {
                const password_valid = validatePassword(user.password);
                if (!password_valid.valid) {
                    errors.push({index: i, field: "password", error: password_valid.error });
                    is_valid = false;
                };
            };

            if (!user.name) {
                errors.push({ index: i, field: "name", error: "No name provided" });
                is_valid = false;
            };

            if (user.role === undefined) {
                errors.push({ index: i, field: "role", error: "No role provided" });
                is_valid = false;
            } else if (isNaN(user.role) || user.role < 0 || user.role > 3) {
                errors.push({ index: i, field: "role", error: "Invalid role" });
                is_valid = false;
            };

            if (user.role === ROLE_STUDENT && !user.year_group) {
                errors.push({ index: i, field: "year_group", error: "No year group provided" });
                is_valid = false;
            };

            if (is_valid) {
                const hashed_password = await bcrypt.hash(user.password, 10);
                const new_user = await new db_users({
                    username: user.username,
                    password: hashed_password,
                    name: user.name,
                    role: user.role,
                    year_group: user.year_group,
                }).save();
                created_users.push(new_user);
            }
        };
    
        return res.status(201).json({
            success: true,
            data: {
                users: created_users,
                errors: errors,
            },
        });
    } catch(e: any) {
        log(`Error on PUT \`/users/bulk\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// List all users in the database
// requires at least a teacher account or above
web_server.get("/users", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const users = await db_users.find({});
        
        return res.status(200).json({
            success: true,
            data: users.map(x => x.toObject({ flattenObjectIds: true })),
        });
    } catch(e: any) {
        log(`Error on GET \`/users\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// fetch a user by ID. Provide @me to return the current user
// requires authentication
web_server.get("/users/:user_id", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const { user_id } = req.params;
        if (user_id === "@me") {
            //return the current user
            return res.status(200).json({
                success: true,
                data: authCheck.user,
            });
        };

        if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(404).send("User not found");
        const user = await db_users.findById(user_id);
        if (!user) return res.status(404).send("User not found");
        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch(e: any) {
        log(`Error on GET \`/users/:user_id\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

//edit a user. All parameters optional
// required senior staff or it staff
web_server.patch("/users/:user_id", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const { user_id } = req.params;
        const user = await db_users.findById(user_id);
        if (!user) return res.status(404).send("User not found");

        // if a new password is provided, validate that + hash it:
        let new_password:string | null = null;
        if (req.body.password) {
            const password_valid = validatePassword(req.body.password);
            if (!password_valid.valid) return res.status(400).send(password_valid.error);
            new_password = await bcrypt.hash(req.body.password, 10);
        };
        // if a new username is provided, validate that:
        if (req.body.username) {
            const username_valid = await validateUsername(req.body.username, user_id);
            if (!username_valid.valid) return res.status(400).send(username_valid.error);
        };
        //if a role is provided, validate that:
        if (req.body.role) {
            if (isNaN(req.body.role)) return res.status(400).send("Invalid role");
            if (req.body.role < 0 || req.body.role > 3) return res.status(400).send("Invalid role");
        };

        const result = await db_users.findByIdAndUpdate(user_id, {
            username: req.body.username ?? user.username,
            password: new_password ?? user.password,
            name: req.body.name ?? user.name,
            role: "role" in req.body ? req.body.role : user.role,
            on_duty: "on_duty" in req.body ? req.body.on_duty : user.on_duty,
            restriction_daily: "restriction_daily" in req.body ? req.body.restriction_daily : user.restriction_daily,
            restriction_class: "restriction_class" in req.body ? req.body.restriction_class : user.restriction_class,
            year_group: "year_group" in req.body ? req.body.year_group : user.year_group,
        }, { new: true });
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch(e: any) {
        log(`Error on PATCH \`/users/:user_id\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// delete one or more users. Pass bulk for :users_id and an array of IDs in the body
// required senior staff or it staff
web_server.delete("/users/:user_id", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        if (req.params.user_id === "bulk") {
            const { ids } = req.body;
            if (!ids) return res.status(400).send("No IDs provided");
            if (!Array.isArray(ids)) return res.status(400).send("Must provide an array of IDs");

            await db_users.deleteMany({ _id: { $in: ids } });
            return res.status(200).json({
                success: true,
            });
        } else {
            const { user_id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(404).send("User not found");
            const user = await db_users.findById(user_id);
            if (!user) return res.status(404).send("User not found");
            const result = await db_users.findByIdAndDelete(user_id);
            return res.status(200).json({
                success: true,
            });
        };
    } catch(e: any) {
        log(`Error on DELETE \`/users/:user_id\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// add a tour to the user's completed tours list
web_server.post("/users/@me/tours/:tour_id", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const result = await db_users.findByIdAndUpdate(authCheck.user._id, {
            $addToSet: {
                completed_tours: req.params.tour_id,
            }
        }, { new: true });
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch(e: any) {
        log(`Error on POST \`/users/@me/tours/:tour_id\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// set the on duty status of the user
// only for teacher or above
web_server.post("/users/@me/duty-status", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");
    
        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");
    
        const { on_duty } = req.body;
    
        const result = await db_users.findByIdAndUpdate(authCheck.user._id, {
            on_duty: !!on_duty,
        }, { new: true });
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch(e: any) {
        log(`Error on POST \`/users/@me/duty-status\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

web_server.post("/users/@me/push-token", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");
    
        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");
    
        const { push_token } = req.body;
    
        const result = await db_users.findByIdAndUpdate(authCheck.user._id, {
            expo_push_token: push_token,
        }, { new: true });

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch(e: any) {
        log(`Error on POST \`/users/@me/duty-status\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// Create a pass. Body requires `destination`, `origin` and `duration`.
// only student accounts can use this endpoint. Destination and origin must be valid classrooms and destinations respectively
web_server.put("/passes", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");
        
        const roleCheck = await checkUserRole(authCheck.user, [ROLE_STUDENT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");
    
        const { destination, origin, duration } = req.body;
        if (!destination) return res.status(400).send("No destination provided");
        if (!DESTINATIONS.find(x => x.id === destination)) return res.status(400).send("Invalid destination");

        if (!origin) return res.status(400).send("No origin provided");
        if (!CLASSROOMS.find(x => x.name === origin)) return res.status(400).send("Invalid origin");

        if (!duration) return res.status(400).send("No duration provided");
        if (isNaN(duration) || duration < 0) return res.status(400).send("Invalid duration");
        if (duration > MAX_PASS_DURATION) return res.status(400).send("Duration too long");


        async function returnWithFailedAttempt(status: number, message: string) {
            await db_users.findByIdAndUpdate(authCheck!.user._id, {
                $inc: {
                    failed_pass_attempts: 1,
                },
            });

            return res.status(status).send(message);
        }
    
        const users_active_passes = await db_passes.countDocuments({ user_id: authCheck.user._id, completed_at: { $exists: false } });
        if (users_active_passes > 0) return await returnWithFailedAttempt(409, "Cannot create a pass while you have an active pass");

        const user = authCheck.user;
        const pass_meets_restrictions = await checkRestrictions(user, destination);
        if (!pass_meets_restrictions) return await returnWithFailedAttempt(400, "Does not follow restrictions");
    
        // check for student grouping
        const pass_will_create_group = await checkStudentGrouping(user, destination, origin);
        if (pass_will_create_group) return await returnWithFailedAttempt(400, "Group too large");
    
        // create the pass
        const pass = await new db_passes({
            user_id: user._id,
            destination: destination,
            origin: origin,
            duration: duration,
        }).save();
        return res.status(201).json({
            success: true,
            data: pass,
        });
    } catch(e: any) {
        log(`Error on PUT \`/passes\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// List all passes. For student accounts, only those they own are returned.
// Requires authentication
web_server.get("/passes", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_STUDENT]);
        if (roleCheck) {
            const users_passes = await db_passes.find({ user_id: authCheck.user._id });
            return res.status(200).json({
                success: true,
                data: users_passes.map(x => x.toObject({ flattenObjectIds: true })),
            });
        } else {
            const all_passes = await db_passes.find({});
            return res.status(200).json({
                success: true,
                data: all_passes.map(x => x.toObject({ flattenObjectIds: true })),
            });
        };
    } catch(e: any) {
        log(`Error on GET \`/passes\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// Fetch a specific pass by ID
// requires teacher account or above
web_server.get("/passes/:pass_id", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const { pass_id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(pass_id)) return res.status(404).send("Pass not found");
        const pass = await db_passes.findById(pass_id);
        if (!pass) return res.status(404).send("Pass not found");
        return res.status(200).json({
            success: true,
            data: pass,
        });
    } catch(e: any) {
        log(`Error on GET \`/passes/:pass_id\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// Mark a pass as completed
// Only student accounts can use this endpoint, can the student must own the pass
web_server.post("/passes/:pass_id/complete", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_STUDENT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const { pass_id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(pass_id)) return res.status(404).send("Pass not found");
        const pass = await db_passes.findById(pass_id);
        if (!pass) return res.status(404).send("Pass not found");
        if (pass.user_id !== authCheck.user._id) return res.status(403).send("You are not the owner of this pass");
        if (pass.completed_at) return res.status(409).send("Pass already completed");

        const result = await db_passes.findByIdAndUpdate(pass_id, {
            completed_at: new Date(),
        }, { new: true });
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch(e: any) {
        log(`Error on POST \`/passes/:pass_id/complete\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// List restrictions
// requires a teacher account or above
web_server.get("/restrictions", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const restrictions = await db_restrictions.find();
        return res.status(200).json({
            success: true,
            data: restrictions.map(x => x.toObject({ flattenObjectIds: true })),
        });
    } catch(e: any) {
        log(`Error on GET \`/restrictions\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// get a specific restriction by ID
// requires a teacher account or above
web_server.get("/restrictions/:restriction_id", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const { restriction_id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(restriction_id)) return res.status(404).send("Restriction not found");
        const restriction = await db_restrictions.findById(restriction_id);
        if (!restriction) return res.status(404).send("Restriction not found");
        return res.status(200).json({
            success: true,
            data: restriction,
        });
    } catch(e: any) {
        log(`Error on GET \`/restrictions/:restriction_id\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// create a new restriction
// required IT or senior staff
web_server.put("/restrictions", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_IT, ROLE_SENIOR]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const { name, type, ttl, amount, interval, target } = req.body;

        if (!name) return res.status(400).send("No name provided");
        if (!type) return res.status(400).send("No type provided");
        if (type !== "area" && type !== "frequency") return res.status(400).send("Invalid type");
 
        if (!amount) return res.status(400).send("No amount provided");
        if (isNaN(amount)) return res.status(400).send("Invalid amount");
        if (amount < 0) return res.status(400).send("Amount must be positive");
        
        //ttl is optional. A zero value or no value will be treated as infinite
        if (ttl) {
            if (isNaN(ttl)) return res.status(400).send("Invalid TTL");
            if (ttl < 0) return res.status(400).send("TTL must be positive");
        }

        //interval is only required for frequency restrictions, optional for area restrictions
        if (type === "frequency" && !interval) return res.status(400).send("No interval provided");
        if (interval) {
            if (isNaN(interval)) return res.status(400).send("Invalid interval");
            if (interval < 0) return res.status(400).send("Interval must be positive");
        }
        
        if (type === "area" && !target) return res.status(400).send("No target provided");

        const restriction = await new db_restrictions({
            name: name,
            type: type,
            ttl: ttl ?? 0,
            amount: amount,
            interval: interval,
            target: target,
        }).save();

        return res.status(201).json({
            success: true,
            data: restriction,
        });
    } catch(e: any) {
        log(`Error on PUT \`/restrictions\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// edit a restriction
// required IT or senior staff
web_server.patch("/restrictions/:restriction_id", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_IT, ROLE_SENIOR]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const { restriction_id } = req.params;
        const restriction = await db_restrictions.findById(restriction_id);
        if (!restriction) return res.status(404).send("Restriction not found");

        const { name, type, ttl, amount, interval, target } = req.body;

        if (type && type !== "area" && type !== "frequency") return res.status(400).send("Invalid type");
        if (amount && isNaN(amount)) return res.status(400).send("Invalid amount");
        if (interval && isNaN(interval)) return res.status(400).send("Invalid interval");
        if (ttl && isNaN(ttl)) return res.status(400).send("Invalid TTL");

        if (name) restriction.name = name;
        if (type) restriction.type = type;
        if ("ttl" in req.body) restriction.ttl = ttl;
        if ("amount" in req.body) restriction.amount = amount;
        if ("interval" in req.body) restriction.interval = interval;
        if ("target" in req.body) restriction.target = target;

        await restriction.save();

        return res.status(200).json({
            success: true,
            data: restriction,
        });
    } catch(e: any) {
        log(`Error on PATCH \`/restrictions/:restriction_id\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// delete a restriction
// required IT or senior staff
web_server.delete("/restrictions/:restriction_id", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_IT, ROLE_SENIOR]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        if (req.params.restriction_id === "bulk") {
            const { ids } = req.body;
            if (!ids) return res.status(400).send("No IDs provided");
            if (!Array.isArray(ids)) return res.status(400).send("Must provide an array of IDs");

            await db_restrictions.deleteMany({ _id: { $in: ids } });
            return res.status(200).json({
                success: true,
            });
        } else {
            const { restriction_id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(restriction_id)) return res.status(404).send("Restriction not found");
            const restriction = await db_restrictions.findById(restriction_id);
            if (!restriction) return res.status(404).send("Restriction not found");
            
            await db_restrictions.findByIdAndDelete(restriction_id);

            return res.status(200).json({
                success: true,
            });
        };
    } catch(e: any) {
        log(`Error on DELETE \`/restrictions/:restriction_id\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// List all groupings
// requires a teacher account or above
web_server.get("/groupings", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const groupings = await db_groupings.find({});
        return res.status(200).json({
            success: true,
            data: groupings.map(x => x.toObject({ flattenObjectIds: true })),
        });
    } catch(e: any) {
        log(`Error on GET \`/groupings\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// Fetch a specific grouping by ID
// requires a teacher account or above
web_server.get("/groupings/:grouping_id", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const { grouping_id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(grouping_id)) return res.status(404).send("Grouping not found");
        const grouping = await db_groupings.findById(grouping_id);
        if (!grouping) return res.status(404).send("Grouping not found");
        return res.status(200).json({
            success: true,
            data: grouping,
        });
    } catch(e: any) {
        log(`Error on GET \`/groupings/:grouping_id\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// Resolve a grouping
// requires a teacher account or above
web_server.post("/groupings/:grouping_id/resolve", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");
    
        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");
    
        const { grouping_id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(grouping_id)) return res.status(404).send("Grouping not found");
        const grouping = await db_groupings.findById(grouping_id);
        if (!grouping) return res.status(404).send("Grouping not found");
        if (grouping.resolved_at) return res.status(409).send("Grouping already resolved");
    
        const result = await db_groupings.findByIdAndUpdate(grouping_id, {
            resolved_at: new Date(),
            resolved_by: authCheck.user._id,
        }, { new: true });
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch(e: any) {
        log(`Error on POST \`/groupings/:grouping_id/resolve\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// Fetch all stats for the dashboard homepage
// requires a teacher account or above
web_server.get("/stats/homepage", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const users = await db_users.find({});
        const passes = await db_passes.find({});
        const restrictions = await db_restrictions.find({});
        const groupings = await db_groupings.find({});

        //ensure that are most recent passes are first
        passes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        groupings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const recent_passes = passes.slice(0, 5);
        const recent_groupings = groupings.filter(x => !x.resolved_at).slice(0, 5);

        return res.status(200).json({
            success: true,
            data: {
                users: {
                    total: users.length,
                    students: users.filter(x => x.role === ROLE_STUDENT).length,
                },
                passes: {
                    total: passes.length,
                    active: passes.filter(x => !x.completed_at).length,
                    completed: passes.filter(x => x.completed_at !== null).length,
                },
                groupings: {
                    total: groupings.length,
                    active: groupings.filter(x => !x.resolved_at).length,
                    resolved: groupings.filter(x => x.resolved_at !== null).length,
                },
                restrictions: {
                    total: restrictions.length,
                    active: restrictions.filter(x => x.ttl === 0 || x.created_at.getTime() + x.ttl > Date.now()).length,
                    expired: restrictions.filter(x => x.ttl !== 0 && x.created_at.getTime() + x.ttl < Date.now()).length,
                },

                recent_passes: recent_passes,
                recent_groupings: recent_groupings,
                //get user info about recent pass creators
                related_users: users.filter(x => recent_passes.map(y => y.user_id).includes(x.id)),
            }
        });
    } catch(e: any) {
        log(`Error on GET \`/stats/homepage\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

// Fetch all stats for the analytics page
// requires a teacher account or above
web_server.get("/stats/analytics", async(req, res) => {
    try {
        const authCheck = await validateAuthHeader(req.headers.authorization);
        if (!authCheck) return res.status(401).send("Unauthorized");

        const roleCheck = await checkUserRole(authCheck.user, [ROLE_TEACHER, ROLE_SENIOR, ROLE_IT]);
        if (!roleCheck) return res.status(403).send("Missing permissions");

        const current_period_end = new Date()
        const current_period_start = new Date(current_period_end.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

        const pipeline = (group_by: any) => [
            {
                $match: {
                    created_at: {
                        $gte: current_period_start,
                        $lt: current_period_end,
                    }
                }
            },
            {
                $group: {
                    _id: group_by,
                    value: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            },
            {
                $project: {
                    label: "$_id",
                    value: "$value",
                    _id: 0
                }
            }
        ] as PipelineStage[];

        function groupWithOther(data: { label: string, value: number }[]) {
            if (data.length < 10) return data;
            const average = Math.ceil(data.reduce((sum, item) => sum + item.value, 0) / data.length);
            const new_data = [] as { label: string, value: number }[];
            let total_for_other = 0;
            for (const item of data) {
                if (item.value <= average * 0.5) {
                    total_for_other += item.value
                } else {
                    new_data.push(item);
                };
            };
            if (total_for_other > 0) new_data.push({ label: "Other", value: total_for_other });
            return new_data;
        };

        const passes_over_time = await db_passes.aggregate(pipeline({ $dateToString: { format: "%Y-%m-%d", date: "$created_at" } })) as { label: string, value: number }[];
        const groupings_over_time = await db_groupings.aggregate(pipeline({ $dateToString: { format: "%Y-%m-%d", date: "$created_at" } })) as { label: string, value: number }[];

        let destination_frequencies_raw = await db_passes.aggregate(pipeline("$destination")) as { label: string, value: number }[];
        let origin_frequencies_raw = await db_passes.aggregate(pipeline("$origin")) as { label: string, value: number }[];
        let location_frequencies_raw = await db_groupings.aggregate(pipeline("$location")) as { label: string, value: number }[];

        destination_frequencies_raw = destination_frequencies_raw.map(x => ({ label: DESTINATIONS.find(y => y.id === x.label)!.name, value: x.value }));
        location_frequencies_raw = location_frequencies_raw.map(x => ({ label: DESTINATIONS.find(y => y.id === x.label)!.name, value: x.value }));

        const destination_frequencies = groupWithOther(destination_frequencies_raw);
        const origin_frequencies = groupWithOther(origin_frequencies_raw);
        const location_frequencies = groupWithOther(location_frequencies_raw);

        return res.status(200).json({
            success: true,
            data: {
                passes_over_time: padMissingDates(passes_over_time, current_period_start, current_period_end),
                groupings_over_time: padMissingDates(groupings_over_time, current_period_start, current_period_end),

                pass_destination_frequencies: destination_frequencies,
                pass_origin_frequencies: origin_frequencies,
                grouping_location_frequencies: location_frequencies,
            }
        });

    } catch(e: any) {
        log(`Error on GET \`/stats/analytics\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
});

process.on("unhandledRejection", handleError);
process.on("uncaughtException", handleError);