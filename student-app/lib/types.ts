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

export type Pass = {
    _id: string;
    created_at: string;
    updated_at: string;
    
    user_id: string;
    location: string;
    duration: number;
    state: "active" | "expired";
}

export type Restriction = {
    id: string;
    created_at: string;
    updated_at: string;

    name: string;
    type: "area" | "frequency";
    ttl: number;
    amount: number;
    interval?: number;
    target?: string;
}