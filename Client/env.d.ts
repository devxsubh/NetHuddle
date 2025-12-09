// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    
    NEXT_PUBLIC_TENOR_API_KEY: string;
    NEXT_PUBLIC_BASE_URL: string;
    NEXT_PUBLIC_ABSOLUTE_BASE_URL: string;

    SESSION_SECRET: string;
    NEXT_PUBLIC_CLIENT_URL: string;
    EMAIL: string;
    PASSWORD: string;
    PRIVATE_KEY_RECOVERY_SECRET: string;
  }
}
