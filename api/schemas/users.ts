import { Schema, model } from "mongoose";

//Contains the schema & type def for the users collection

export type User = {
    //added automatically as a string version of the `_id` field. Doesnt need to be included in the schema
    id: string;
    //this and updated_at are added automatically by mongoose via the `timestamps` option in the schema
    created_at: Date;
    updated_at: Date;

    username: string;
    password: string;
    name: string;
    role: number;
    sessions: {
        id: string;
        token: string;
        expiry: Date;
    }[];

    // Student fields
    restriction_daily?: number;
    restriction_class?: number;
    failed_pass_attempts?: number;

    // Staff fields
    on_duty?: boolean;
}

const sessionSchema = new Schema({
    token: { type: String, required: true },
    expiry: { type: Date, required: true },
});

const schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: Number, required: true },
    sessions: { type: [sessionSchema], required: true, default: [] },

    // Student fields
    restriction_daily: { type: Number, required: false, default: 0 },
    restriction_class: { type: Number, required: false, default: 0 },
    failed_pass_attempts: { type: Number, required: false, default: 0 },

    // Staff fields
    on_duty: { type: Boolean, required: false, default: false },
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
});

export default model<User>("users", schema);