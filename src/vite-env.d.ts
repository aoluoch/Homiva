/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string;
  readonly VITE_APPWRITE_PROJECT_ID: string;
  readonly VITE_APPWRITE_DATABASE_ID: string;
  readonly VITE_APPWRITE_BUCKET_PROPERTY_IMAGES: string;
  readonly VITE_APPWRITE_BUCKET_AVATARS: string;
  readonly VITE_APPWRITE_FUNCTION_ADMIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
