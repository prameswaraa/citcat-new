import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, Locale } from './config';

// Static imports for all message files - required for Cloudflare Workers compatibility
// Dynamic imports with template literals don't work reliably in bundled Workers environment
import enCommon from '../../messages/en/common.json';
import enNavigation from '../../messages/en/navigation.json';
import enAuth from '../../messages/en/auth.json';
import enValidation from '../../messages/en/validation.json';
import enErrors from '../../messages/en/errors.json';
import enDashboard from '../../messages/en/dashboard.json';
import enSubscription from '../../messages/en/subscription.json';
import enAdmin from '../../messages/en/admin.json';
import enSettings from '../../messages/en/settings.json';
import enMessages from '../../messages/en/messages.json';
import enCustomers from '../../messages/en/customers.json';
import enTemplates from '../../messages/en/templates.json';
import enLanguage from '../../messages/en/language.json';
import enPayment from '../../messages/en/payment.json';
import enHelpSupport from '../../messages/en/helpSupport.json';
import enTeam from '../../messages/en/team.json';
import enPrivacy from '../../messages/en/privacy.json';
import enTerms from '../../messages/en/terms.json';
import enBroadcast from '../../messages/en/broadcast.json';
import enInsights from '../../messages/en/insights.json';
import enWaba from '../../messages/en/waba.json';
import enWabaHealth from '../../messages/en/wabaHealth.json';
import enLegal from '../../messages/en/legal.json';
import enWhatsappErrors from '../../messages/en/whatsappErrors.json';

import idCommon from '../../messages/id/common.json';
import idNavigation from '../../messages/id/navigation.json';
import idAuth from '../../messages/id/auth.json';
import idValidation from '../../messages/id/validation.json';
import idErrors from '../../messages/id/errors.json';
import idDashboard from '../../messages/id/dashboard.json';
import idSubscription from '../../messages/id/subscription.json';
import idAdmin from '../../messages/id/admin.json';
import idSettings from '../../messages/id/settings.json';
import idMessages from '../../messages/id/messages.json';
import idCustomers from '../../messages/id/customers.json';
import idTemplates from '../../messages/id/templates.json';
import idLanguage from '../../messages/id/language.json';
import idPayment from '../../messages/id/payment.json';
import idHelpSupport from '../../messages/id/helpSupport.json';
import idTeam from '../../messages/id/team.json';
import idPrivacy from '../../messages/id/privacy.json';
import idTerms from '../../messages/id/terms.json';
import idBroadcast from '../../messages/id/broadcast.json';
import idInsights from '../../messages/id/insights.json';
import idWaba from '../../messages/id/waba.json';
import idWabaHealth from '../../messages/id/wabaHealth.json';
import idLegal from '../../messages/id/legal.json';
import idWhatsappErrors from '../../messages/id/whatsappErrors.json';

// Pre-built message objects for each locale
const messagesByLocale: Record<string, Record<string, unknown>> = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    validation: enValidation,
    errors: enErrors,
    dashboard: enDashboard,
    subscription: enSubscription,
    admin: enAdmin,
    settings: enSettings,
    messages: enMessages,
    customers: enCustomers,
    templates: enTemplates,
    language: enLanguage,
    payment: enPayment,
    helpSupport: enHelpSupport,
    team: enTeam,
    privacy: enPrivacy,
    terms: enTerms,
    broadcast: enBroadcast,
    insights: enInsights,
    waba: enWaba,
    wabaHealth: enWabaHealth,
    legal: enLegal,
    whatsappErrors: enWhatsappErrors,
  },
  id: {
    common: idCommon,
    navigation: idNavigation,
    auth: idAuth,
    validation: idValidation,
    errors: idErrors,
    dashboard: idDashboard,
    subscription: idSubscription,
    admin: idAdmin,
    settings: idSettings,
    messages: idMessages,
    customers: idCustomers,
    templates: idTemplates,
    language: idLanguage,
    payment: idPayment,
    helpSupport: idHelpSupport,
    team: idTeam,
    privacy: idPrivacy,
    terms: idTerms,
    broadcast: idBroadcast,
    insights: idInsights,
    waba: idWaba,
    wabaHealth: idWabaHealth,
    legal: idLegal,
    whatsappErrors: idWhatsappErrors,
  },
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Get pre-loaded messages for the locale
  const messages = messagesByLocale[locale] || messagesByLocale[defaultLocale];

  return {
    locale,
    messages,
  };
});
