import CLASSROOMS from "@/lib/locations/classrooms";
import DESTINATIONS from "@/lib/locations/destinations";

export enum UserRole {
    STUDENT,
    TEACHER,
    IT,
    SENIOR,
}

export type User = {
    _id: string;
    created_at: string;
    updated_at: string;

    username: string;
    password: string;
    name: string;
    role: UserRole;
    sessions: {
        id: string;
        created_at: string;
        
        token: string;
        expiry: string;
    }[];

    // Student fields
    restriction_daily?: number;
    restriction_class?: number;
    failed_pass_attempts?: number;

    // Staff fields
    on_duty?: boolean;
}

const classroom_names = CLASSROOMS.map(x => x.name);
const destination_ids = DESTINATIONS.map(x => x.id);

export type Pass = {
    _id: string;
    created_at: string;
    updated_at: string;
    
    user_id: string;
    completed_at?: string;
    origin: typeof classroom_names[number];
    destination: typeof destination_ids[number];
    duration: number;
}

export type Restriction = {
    _id: string;
    created_at: string;
    updated_at: string;

    name: string;
    type: "area" | "frequency";
    ttl: number;
    amount: number;
    interval?: number;
    target?: string;
}