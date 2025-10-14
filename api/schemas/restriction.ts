import { Schema, model } from "mongoose";

//Contains the schema & type def for the restrictions collection

export type Restriction = {
    //added automatically as a string version of the `_id` field. Doesnt need to be included in the schema
    id: string;
    //this and updated_at are added automatically by mongoose via the `timestamps` option in the schema
    created_at: Date;
    updated_at: Date;
    
    name: string;
    type: "area" | "frequency";
    ttl: number;
    amount: number;
    interval?: number;
    target?: string;
}
const schema = new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ["area", "frequency"] },
    ttl: { type: Number, required: true },
    amount: { type: Number, required: true },
    interval: { type: Number, required: false },
    target: { type: String, required: false },
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
});

export default model<Restriction>("restrictions", schema);