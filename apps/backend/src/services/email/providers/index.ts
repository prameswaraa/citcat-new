export type { 
  EmailProvider, 
  EmailSendOptions, 
  EmailSendResult, 
  SMTPConfig 
} from './types.js';

export { SMTPProvider, createSMTPProviderFromEnv } from './smtp-provider.js';
