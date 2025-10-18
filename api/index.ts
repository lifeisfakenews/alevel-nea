//Import required pacakges
import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

// Import db schemas and types
import { db_users, db_passes, db_restrictions } from "@/schemas";
import type { User, Pass, Restriction } from "@/schemas";

//Define key constants
const ROLE_STUDENT = 0;
const ROLE_TEACHER = 1;
const ROLE_IT = 2;
const ROLE_SENIOR = 3;

const MAX_PASS_DURATION = 60 * 60 * 1000;//1 hour in ms
const MAX_STUDENTS_FOR_GROUP = 4;

//Env vars
const DB_URL = import.meta.env.DB_URL;
const PORT = import.meta.env.PORT || 3000;
const WEBHOOK_URL = import.meta.env.WEBHOOK_URL;

// Util functions

//handle unhandled promise rejections + uncaught exceptions
function handleError(err: any) {
    log(`${err.message}\n\`\`\`${err.stack}\`\`\``, "error");
}
process.on("unhandledRejection", handleError);
process.on("uncaughtException", handleError);


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
}

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
}


//Connect to the database, if a connection isnt already established
if (!mongoose.connection.readyState) {
    mongoose.connect(DB_URL).then(x => log("Connected to mongoDB", "reload"));
};


//Setup express (web server) on the specified port
const web_server = express();
web_server.listen(PORT, () => {
    log(`Server listening on port ${PORT}`, "reload");
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
        if (!user) return res.status(401).send("Invalid username");
    
        const password_match = await bcrypt.compare(password, user.password);
        if (!password_match) return res.status(401).send("Invalid password");
    
        const base64_encoded_user_id = btoa(user.id);
        const token = `${base64_encoded_user_id}.${randomString(32)}`;
        const expiry = Date.now() + (1000 * 60 * 60 * 24 * 7);//7 days from now
        //Create a new session
        user.sessions.push({
            id: randomUUID(),
            token: token,
            expiry: new Date(expiry),
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

// perform required checks for usernames when account is created
async function validateUsername(username: string) {
    if (!username) return {valid: false, error: "No username provided"};
    if (username.length < 3 || username.length >= 24) return {valid: false, error: "Username must be between 3 and 24 characters"};
    // the regex matches to lower case letters, numbers and dashes
    // if the full string doesnt match then the username contains disallowed characters
    if (!username.match(/^[a-z0-9-]+$/)) return {valid: false, error: "Username can only contain letters, numbers, and dashes"};

    const user = await db_users.findOne({ username });
    if (user) return {valid: false, error: "Username already taken"};

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
}

// create a new user. Body requires `username`, `password`, `name`, and `role`
// TODO: This will be restricted to staff only, however to create test accounts easily it isnt.
web_server.put("/users", async(req, res) => {
    try {
        const { username, password, name, role } = req.body;
        if (!username) return res.status(400).send("No username provided");
        if (!password) return res.status(400).send("No password provided");
        if (!name) return res.status(400).send("No name provided");
        if (role === undefined) return res.status(400).send("No role provided");

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
        }).save();

        return res.status(201).json({
            sucess: true,
            data: new_user,
        });
    } catch(e: any) {
        log(`Error on PUT \`/users\`\n\`\`\`${e.message}\`\`\`\n\n\`\`\`${e.stack}\`\`\``, "error");
        return res.status(500).send("Internal server error");
    }
})