export type User = {
    id: string;
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

export type Pass = {
    id: string;
    created_at: Date;
    updated_at: Date;
    
    user_id: string;
    location: string;
    duration: number;
    state: "active" | "expired";
}

export type Restriction = {
    id: string;
    created_at: Date;
    updated_at: Date;

    name: string;
    type: "area" | "frequency";
    ttl: number;
    amount: number;
    interval?: number;
    target?: string;
}