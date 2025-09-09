/**
 * Environment Configuration Template
 * This file defines the structure of environment variables needed for deployment
 * Secrets are injected via GitHub Actions secrets, non-sensitive config is defined here
 */

const envTemplate = {
  // =============================================================================
  // APP CONFIGURATION (Non-sensitive)
  // =============================================================================
  APP_TITLE: 'Vajra',
  CUSTOM_FOOTER: '"Vajra"',
  HELP_AND_FAQ_URL: '',
  
  // =============================================================================
  // SERVER CONFIGURATION (Non-sensitive)
  // =============================================================================
  HOST: 'localhost', // Will be overridden in production
  PORT: '3080',
  
  // Database (production values)
  MONGO_URI: 'mongodb://mongodb:27017/LibreChat',
  
  // Trust proxy for production
  NO_INDEX: 'true',
  TRUST_PROXY: '1',
  
  // =============================================================================
  // ENDPOINTS CONFIGURATION (Non-sensitive)
  // =============================================================================
  ENDPOINTS: 'openAI,anthropic,google,custom,agents',
  PROXY: '',
  
  // =============================================================================
  // MODEL CONFIGURATIONS (Non-sensitive)
  // =============================================================================
  OPENAI_MODELS: 'gpt-5,gpt-5-chat-latest,gpt-4.1-2025-04-14,o3-deep-research-2025-06-26,o4-mini-deep-research-2025-06-26,gpt-4o-realtime-preview-2025-06-03',
  ANTHROPIC_MODELS: 'claude-opus-4-1-20250805,claude-sonnet-4-20250514',
  GOOGLE_MODELS: 'gemini-2.5-pro,gemini-2.5-flash-lite',
  
  // =============================================================================
  // FEATURE FLAGS (Non-sensitive)
  // =============================================================================
  ALLOW_EMAIL_LOGIN: 'true',
  ALLOW_REGISTRATION: 'true',
  ALLOW_SOCIAL_LOGIN: 'false',
  ALLOW_SOCIAL_REGISTRATION: 'false',
  ALLOW_PASSWORD_RESET: 'false',
  ALLOW_UNVERIFIED_EMAIL_LOGIN: 'true',
  
  // =============================================================================
  // RATE LIMITING & SECURITY (Non-sensitive)
  // =============================================================================
  SESSION_EXPIRY: '1000 * 60 * 15',
  REFRESH_TOKEN_EXPIRY: '1000 * 60 * 60 * 24 * 7',
  
  BAN_VIOLATIONS: 'true',
  BAN_DURATION: '1000 * 60 * 60 * 2',
  BAN_INTERVAL: '20',
  
  LOGIN_VIOLATION_SCORE: '1',
  REGISTRATION_VIOLATION_SCORE: '1',
  CONCURRENT_VIOLATION_SCORE: '1',
  MESSAGE_VIOLATION_SCORE: '1',
  NON_BROWSER_VIOLATION_SCORE: '20',
  TTS_VIOLATION_SCORE: '0',
  STT_VIOLATION_SCORE: '0',
  FORK_VIOLATION_SCORE: '0',
  IMPORT_VIOLATION_SCORE: '0',
  FILE_UPLOAD_VIOLATION_SCORE: '0',
  
  LOGIN_MAX: '7',
  LOGIN_WINDOW: '5',
  REGISTER_MAX: '5',
  REGISTER_WINDOW: '60',
  
  LIMIT_CONCURRENT_MESSAGES: 'true',
  CONCURRENT_MESSAGE_MAX: '2',
  
  LIMIT_MESSAGE_IP: 'true',
  MESSAGE_IP_MAX: '40',
  MESSAGE_IP_WINDOW: '1',
  
  LIMIT_MESSAGE_USER: 'false',
  MESSAGE_USER_MAX: '40',
  MESSAGE_USER_WINDOW: '1',
  
  ILLEGAL_MODEL_REQ_SCORE: '5',
  
  // =============================================================================
  // SEARCH CONFIGURATION (Non-sensitive)
  // =============================================================================
  SEARCH: 'false',
  MEILI_NO_ANALYTICS: 'true',
  MEILI_HOST: 'http://0.0.0.0:7700',
  
  // =============================================================================
  // LOGGING (Non-sensitive)
  // =============================================================================
  CONSOLE_JSON: 'false',
  DEBUG_LOGGING: 'true',
  DEBUG_CONSOLE: 'false',
  DEBUG_PLUGINS: 'true',
  DEBUG_OPENAI: 'false',
  
  // =============================================================================
  // MODERATION (Non-sensitive)
  // =============================================================================
  OPENAI_MODERATION: 'false',
  
  // =============================================================================
  // DEVELOPMENT (Non-sensitive)
  // =============================================================================
  VITE_SHOW_FORK: 'true',
  
  // =============================================================================
  // RAG CONFIGURATION (Non-sensitive)
  // =============================================================================
  RAG_API_URL: 'http://rag_api:8000',
  RAG_PORT: '8000'
};

// List of sensitive environment variables that should come from secrets
const secretKeys = [
  // AI Provider API Keys
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_KEY',
  'XAI_API_KEY',
  'PERPLEXITY_API_KEY',
  
  // Web Search API Keys
  'SERPER_API_KEY',
  'FIRECRAWL_API_KEY',
  'JINA_API_KEY',
  
  // Speech API Keys
  'STT_API_KEY',
  'TTS_API_KEY',
  
  // Security Keys
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CREDS_KEY',
  'CREDS_IV',
  
  // Database Keys
  'MEILI_MASTER_KEY',
  
  // Domain Configuration (environment-specific)
  'DOMAIN_CLIENT',
  'DOMAIN_SERVER',
  
  // Additional API Keys
  'ASSISTANTS_API_KEY',
  'OPENWEATHER_API_KEY',
  'LIBRECHAT_CODE_API_KEY',
  'ANYSCALE_API_KEY',
  'APIPIE_API_KEY',
  'COHERE_API_KEY',
  'DATABRICKS_API_KEY',
  'FIREWORKS_API_KEY',
  'GROQ_API_KEY',
  'HUGGINGFACE_TOKEN',
  'MISTRAL_API_KEY',
  'OPENROUTER_KEY',
  'SHUTTLEAI_API_KEY',
  'TOGETHERAI_API_KEY',
  'UNIFY_API_KEY'
];

module.exports = {
  envTemplate,
  secretKeys
};
