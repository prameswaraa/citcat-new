/**
 * Brand Configuration
 *
 * All branding values are configurable via environment variables.
 * This allows white-label deployment of the n8n node.
 *
 * To customize, set these environment variables before building:
 * - N8N_NODE_BRAND_NAME: Display name shown in n8n UI
 * - N8N_NODE_BRAND_ID: Internal identifier (camelCase, no spaces)
 * - N8N_NODE_API_BASE_URL: Default API base URL
 * - N8N_NODE_DOCS_URL: Documentation URL
 * - N8N_NODE_HOMEPAGE: Homepage URL
 * - N8N_NODE_SUPPORT_EMAIL: Support email
 * - N8N_NODE_API_KEY_PREFIX: API key prefix (e.g., "kc_live_")
 */

export interface BrandConfig {
	// Display & Identity
	displayName: string;
	nodeId: string;
	credentialId: string;
	description: string;

	// URLs
	apiBaseUrl: string;
	documentationUrl: string;
	homepage: string;

	// Support
	supportEmail: string;
	author: string;

	// API Key
	apiKeyPrefix: string;
	apiKeyPlaceholder: string;
}

/**
 * Get brand configuration from environment variables with defaults
 */
export function getBrandConfig(): BrandConfig {
	const displayName = process.env.N8N_NODE_BRAND_NAME || 'ChatPlatform';
	const brandId = process.env.N8N_NODE_BRAND_ID || 'chatPlatform';
	const apiKeyPrefix = process.env.N8N_NODE_API_KEY_PREFIX || 'cp_live_';

	return {
		// Display & Identity
		displayName,
		nodeId: brandId,
		credentialId: `${brandId}Api`,
		description: process.env.N8N_NODE_DESCRIPTION ||
			'Send WhatsApp, Instagram & Messenger messages with interactive buttons, flexible customer lookup, and typing indicators',

		// URLs
		apiBaseUrl: process.env.N8N_NODE_API_BASE_URL || 'https://api.example.com/api/v1/public',
		documentationUrl: process.env.N8N_NODE_DOCS_URL || 'https://docs.example.com/developers',
		homepage: process.env.N8N_NODE_HOMEPAGE || 'https://example.com',

		// Support
		supportEmail: process.env.N8N_NODE_SUPPORT_EMAIL || 'support@example.com',
		author: process.env.N8N_NODE_AUTHOR || displayName,

		// API Key
		apiKeyPrefix,
		apiKeyPlaceholder: `${apiKeyPrefix}your_api_key_here`,
	};
}

// Export singleton instance for use in node/credentials
export const brandConfig = getBrandConfig();
