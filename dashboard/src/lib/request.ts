import { type APIContext, type AstroGlobal } from "astro";

const BASE_URL = "http://localhost:3000";

type SuccessResponse<T> = { success: true, data: T };
type ErrorResponse = { success: false, error: string };

type Response<T> = SuccessResponse<T> | ErrorResponse;

// send a request to the API
export default async function request<T>(url: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: any, Astro?: AstroGlobal|APIContext): Promise<Response<T>> {
    try {
        // if Astro is defined, we are on the server side, otherwise we are on client
        // fetching cookies from server is with Astro.cookies, client is with document.cookie
        let token:string | undefined;
        if (Astro) {
            token = Astro.cookies.get("token")?.value;
        } else {
            token = document.cookie.split("; ").find(cookie => cookie.startsWith("token="))?.split("=")[1];
        };

        const request = await fetch(`${BASE_URL}/${url}`, {
            method: method,
            headers: {
                // define standard headers
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Accept": "application/json",
                "Authorization": token ?? "",
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (request.ok) {
            const body = await request.json();
            return {
                success: true,
                data: body.data as T,
            };
        } else if (request.status === 401 || request.status === 403) {
            // 401 and 403 are returned if the user isn't authorized or logged in, so send them to the login page
            if (!Astro) window.location.href = "/login";
            return { success: false, error: "Unauthorized" };
        } else if (request.status >= 500) {
            // server error, log details to console for debugging
            console.error(`Request to ${url} failed with status ${request.status}`);
            console.error(request);
            return { success: false, error: await request.text() };
        } else {
            // just return the error message
            return { success: false, error: await request.text() };
        };
    } catch(e) {
        console.error(`Request to ${url} failed with error`, e);
        return { success: false, error: "Failed to send request" };
    }
};