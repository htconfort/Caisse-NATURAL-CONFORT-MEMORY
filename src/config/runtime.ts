export const RUNTIME = {
  ENV: import.meta.env.VITE_ENV,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,

  DEMO_MODE: import.meta.env.VITE_DEMO_MODE === 'true',
  DISABLE_DEMO_DATA: import.meta.env.VITE_DISABLE_DEMO_DATA === 'true',

  N8N_ENABLED: import.meta.env.VITE_N8N_ENABLED === 'true',
  N8N_URL: (import.meta.env.VITE_N8N_URL as string) || '/api/n8n',

  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
} as const;
