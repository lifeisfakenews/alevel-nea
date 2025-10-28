import { defineMiddleware } from "astro:middleware";

import request from "@/lib/request";
import { type User } from "@/lib/types";

export const onRequest = defineMiddleware(async(context, next) => {

    // if the user is already on the login page, they shouldnt be redirected (other wise it will loop)
    const url = new URL(context.request.url);
    if (url.pathname === "/login") return next();

    const cookie = context.cookies.get("token");
    if (!cookie || !cookie.value) return context.redirect("/login");

    // fetch and put the user details into the request context
    const result = await request<User>("users/@me", "GET", undefined, context);
    if (result.success) {
        context.locals.user = result.data;
    } else {
        return context.redirect("/login");
    }

    return next();
});