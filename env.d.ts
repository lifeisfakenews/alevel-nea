
interface ImportMetaEnv {
    DB_URL: string;
    PORT: number;
    WEBHOOK_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}