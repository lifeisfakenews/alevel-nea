/// <reference types="astro/client" />

export {};


declare global {
    namespace App {
        interface Locals {
            user: import("@/lib/types").User;
        }
    }
    interface Window {
        current_active_user_id: string | null;
        current_active_pass_id: string | null;
        current_active_restriction_id: string | null;
    }

    function openModal(id: string): void;
    function closeModal(id: string): void;
}

interface ImportMetaEnv {
    readonly API_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}