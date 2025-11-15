import { type User, type Pass, type Restriction } from "./types";
import request from "./request";

const user_cache = new Map<string, User>();
// fetch a user from the cache or the api
export async function fetchUser(user_id: string) {
    if (user_cache.has(user_id)) return user_cache.get(user_id)!;
    const result = await request<User>(`users/${user_id}`, "GET");
    if (result.success) {
        user_cache.set(user_id, result.data);
        return result.data;
    } else {
        alert(`Error fetching user details:\n ${result.error}`);
        return null;
    };
};

const pass_cache = new Map<string, Pass>();
// fetch a pass from the cache or the api
export  async function fetchPass(pass_id: string) {
    if (pass_cache.has(pass_id)) return pass_cache.get(pass_id)!;
    const result = await request<Pass>(`passes/${pass_id}`, "GET");
    if (result.success) {
        pass_cache.set(pass_id, result.data);
        return result.data;
    } else {
        alert(`Error fetching pass details:\n ${result.error}`);
        return null;
    };
};

const restriction_cache = new Map<string, Restriction>();
export async function fetchRestriction(restriction_id: string) {
    if (restriction_cache.has(restriction_id)) return restriction_cache.get(restriction_id)!;
    const result = await request<Restriction>(`restrictions/${restriction_id}`, "GET");
    if (result.success) {
        restriction_cache.set(restriction_id, result.data);
        return result.data;
    } else {
        alert(`Error fetching restriction details:\n ${result.error}`);
        return null;
    };
};