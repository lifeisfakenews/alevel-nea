import { Schema, model } from "mongoose";

import classrooms from "@/locations/classrooms";
import destinations from "@/locations/destinations";

const classroom_names = classrooms.map(x => x.name);
const destination_ids = destinations.map(x => x.id);

//Contains the schema & type def for the passes collection

export type Pass = {
    //added automatically as a string version of the `_id` field. Doesnt need to be included in the schema
    id: string;
    //this and updated_at are added automatically by mongoose via the `timestamps` option in the schema
    created_at: Date;
    updated_at: Date;
    
    user_id: string;
    completed_at?: Date;
    origin: typeof classroom_names[number];
    destination: typeof destination_ids[number];
    duration: number;
}
const schema = new Schema({
    user_id: { type: String, required: true },
    completed_at: { type: Date, required: false },
    origin: { type: String, required: true, enum: classroom_names },
    destination: { type: String, required: true, enum: destination_ids },
    duration: { type: Number, required: true },
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
});

export default model<Pass>("passes", schema);