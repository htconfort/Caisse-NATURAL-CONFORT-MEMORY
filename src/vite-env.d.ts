/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMMIT_REF?: string;
  readonly VITE_BRANCH?: string;
  readonly VITE_BUILD_TIME?: string;
  readonly VITE_CONTEXT?: 'production' | 'deploy-preview' | 'branch-deploy' | 'development' | string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
