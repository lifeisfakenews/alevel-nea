import { Schema, model } from "mongoose";

//Contains the schema & type def for the passes collection

export type Pass = {
    //added automatically as a string version of the `_id` field. Doesnt need to be included in the schema
    id: string;
    //this and updated_at are added automatically by mongoose via the `timestamps` option in the schema
    created_at: Date;
    updated_at: Date;
    
    user_id: string;
    location: string;
    duration: number;
    state: "active" | "expired";
}
const schema = new Schema({
    user_id: { type: String, required: true },
    location: { type: String, required: true },
    duration: { type: Number, required: true },
    state: { type: String, required: true, enum: ["active", "expired"] },
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
});

export default model<Pass>("passes", schema);