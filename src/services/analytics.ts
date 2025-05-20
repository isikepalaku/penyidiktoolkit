/**
 * File ini berisi konstanta yang digunakan aplikasi.
 * Fungsi-fungsi analytics telah dihapus karena tidak digunakan.
 */

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