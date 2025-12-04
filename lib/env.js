/**
 * Environment variable helpers for consistent access across API routes and libraries.
 * Provides type-safe getters with validation and fail-fast behavior.
 */

/**
 * Get Supabase URL (required)
 * @returns {string}
 */
export function getSupabaseUrl() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    return url;
}

/**
 * Get Supabase anonymous key (for client-side operations)
 * @returns {string}
 */
export function getSupabaseAnonKey() {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    }
    return key;
}

/**
 * Get Supabase service key (for server-side operations with elevated privileges)
 * @returns {string}
 */
export function getSupabaseServiceKey() {
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!key) {
        throw new Error(
            'Missing SUPABASE_SERVICE_KEY environment variable. ' +
            'This key is required for server-side operations. ' +
            'Get it from Supabase Dashboard > Settings > API > service_role key'
        );
    }
    return key;
}

/**
 * Get Facebook App ID
 * @returns {string}
 */
export function getFacebookAppId() {
    const id = process.env.FACEBOOK_APP_ID;
    if (!id) {
        throw new Error(
            'Missing FACEBOOK_APP_ID environment variable. ' +
            'Get it from Meta Developer Dashboard > Your App > Settings > Basic'
        );
    }
    return id;
}

/**
 * Get Facebook App Secret
 * @returns {string}
 */
export function getFacebookAppSecret() {
    const secret = process.env.FACEBOOK_APP_SECRET;
    if (!secret) {
        throw new Error(
            'Missing FACEBOOK_APP_SECRET environment variable. ' +
            'Get it from Meta Developer Dashboard > Your App > Settings > Basic'
        );
    }
    return secret;
}

/**
 * Get Facebook Page Access Token (fallback for OAuth issues)
 * @returns {string|null}
 */
export function getFacebookPageToken() {
    return process.env.FACEBOOK_PAGE_ACCESS_TOKEN || null;
}

/**
 * Get AI provider API key (OpenAI, Anthropic, etc.)
 * @param {string} provider - 'openai' | 'anthropic'
 * @returns {string}
 */
export function getAIApiKey(provider = 'openai') {
    let key;
    let envVar;
    
    switch (provider.toLowerCase()) {
        case 'openai':
            envVar = 'OPENAI_API_KEY';
            key = process.env.OPENAI_API_KEY;
            break;
        case 'anthropic':
            envVar = 'ANTHROPIC_API_KEY';
            key = process.env.ANTHROPIC_API_KEY;
            break;
        default:
            throw new Error(`Unknown AI provider: ${provider}`);
    }
    
    if (!key) {
        throw new Error(
            `Missing ${envVar} environment variable. ` +
            `This is required for AI caption generation.`
        );
    }
    return key;
}

/**
 * Get the configured AI provider
 * @returns {'openai' | 'anthropic'}
 */
export function getAIProvider() {
    return process.env.AI_PROVIDER || 'openai';
}

/**
 * Get the configured AI model
 * @returns {string}
 */
export function getAIModel() {
    const provider = getAIProvider();
    if (provider === 'anthropic') {
        return process.env.AI_MODEL || 'claude-3-sonnet-20240229';
    }
    return process.env.AI_MODEL || 'gpt-4o-mini';
}

/**
 * Check if we're in production environment
 * @returns {boolean}
 */
export function isProduction() {
    return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

/**
 * Check if we're running on Vercel
 * @returns {boolean}
 */
export function isVercel() {
    return !!process.env.VERCEL;
}

/**
 * Get the base URL for the application
 * @returns {string}
 */
export function getBaseUrl() {
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL;
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    return isProduction() ? 'https://www.insuavewetrust.com' : 'http://localhost:3000';
}

/**
 * Validate all required environment variables for Instagram automation
 * Call this at app startup or before critical operations
 * @returns {{ valid: boolean, missing: string[], warnings: string[] }}
 */
export function validateInstagramEnv() {
    const missing = [];
    const warnings = [];
    
    // Required variables
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_KEY',
        'FACEBOOK_APP_ID',
        'FACEBOOK_APP_SECRET'
    ];
    
    for (const varName of required) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }
    
    // AI key - at least one should be set
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        missing.push('OPENAI_API_KEY or ANTHROPIC_API_KEY');
    }
    
    // Optional but recommended
    if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
        warnings.push('FACEBOOK_PAGE_ACCESS_TOKEN not set - OAuth fallback unavailable');
    }
    
    return {
        valid: missing.length === 0,
        missing,
        warnings
    };
}

/**
 * Log environment validation results
 * Useful for debugging deployment issues
 */
export function logEnvStatus() {
    const result = validateInstagramEnv();
    
    console.log('=== Environment Status ===');
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Vercel: ${isVercel() ? 'Yes' : 'No'}`);
    console.log(`Base URL: ${getBaseUrl()}`);
    console.log(`AI Provider: ${getAIProvider()}`);
    console.log(`AI Model: ${getAIModel()}`);
    
    if (result.valid) {
        console.log('✅ All required environment variables are set');
    } else {
        console.log('❌ Missing required variables:', result.missing.join(', '));
    }
    
    if (result.warnings.length > 0) {
        console.log('⚠️ Warnings:', result.warnings.join(', '));
    }
    
    return result;
}

