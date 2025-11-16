import { Schema, model } from "mongoose";

//Contains the schema & type def for the groupings collection

export type Grouping = {
    //added automatically as a string version of the `_id` field. Doesnt need to be included in the schema
    id: string;
    //this and updated_at are added automatically by mongoose via the `timestamps` option in the schema
    created_at: Date;
    updated_at: Date;
    
    resolved_at?: Date;
    resolved_by?: string;

    students: string[];
    location: string;
    // between 0 and 100
    confidence_score: number;
}
const schema = new Schema({
    resolved_at: { type: Date, required: false },
    resolved_by: { type: String, required: false },

    students: { type: [String], required: true },
    location: { type: String, required: true },
    confidence_score: { type: Number, required: true, min: 0, max: 100 },
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
});

export default model<Grouping>("groupings", schema);