import { logAnalyticsEvent } from '../firebase';

// Konstanta event untuk konsistensi
export const ANALYTICS_EVENTS = {
  // Authentication events
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_RESET: 'password_reset',
  
  // Navigation events
  PAGE_VIEW: 'page_view',
  
  // Chat events
  CHAT_STARTED: 'chat_started',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_ENDED: 'chat_ended',
  
  // Feature usage
  FEATURE_USED: 'feature_used',
  
  // Error events
  API_ERROR: 'api_error',
  APP_ERROR: 'app_error',
  
  // PWA events
  PWA_INSTALLED: 'pwa_installed'
};

// Jenis Agent untuk tracking konsisten
export const AGENT_TYPES = {
  SIBER: 'siber',
  TIPIDKOR: 'tipidkor',
  INDAGSI: 'indagsi',
  FISMONDEV: 'fismondev',
  NARKOTIKA: 'narkotika',
  PERKABA: 'perkaba',
  KUHP: 'kuhp',
  ITE: 'ite'
};

// Helper untuk tracking page views
export const trackPageView = (pageName: string, pageParams?: Record<string, any>) => {
  logAnalyticsEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
    page_name: pageName,
    ...pageParams
  });
};

// Helper untuk tracking chat interactions
export const trackChatInteraction = (
  agentType: string, 
  action: string, 
  additionalParams?: Record<string, any>
) => {
  logAnalyticsEvent(action, {
    agent_type: agentType,
    timestamp: new Date().toISOString(),
    ...additionalParams
  });
};

// Helper untuk tracking feature usage
export const trackFeatureUsage = (
  featureName: string, 
  additionalParams?: Record<string, any>
) => {
  logAnalyticsEvent(ANALYTICS_EVENTS.FEATURE_USED, {
    feature_name: featureName,
    ...additionalParams
  });
};

// Helper untuk tracking errors
export const trackError = (
  errorType: string,
  errorMessage: string,
  additionalParams?: Record<string, any>
) => {
  logAnalyticsEvent(
    errorType === 'api' ? ANALYTICS_EVENTS.API_ERROR : ANALYTICS_EVENTS.APP_ERROR,
    {
      error_message: errorMessage,
      ...additionalParams
    }
  );
};

// Helper untuk tracking autentikasi
export const trackAuth = (
  action: string,
  method: string = 'email',
  additionalParams?: Record<string, any>
) => {
  logAnalyticsEvent(action, {
    auth_method: method,
    ...additionalParams
  });
};

// Helper untuk tracking PWA
export const trackPWA = (
  action: string,
  additionalParams?: Record<string, any>
) => {
  logAnalyticsEvent(action, {
    ...additionalParams
  });
}; 