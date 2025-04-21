/**
 * P2SK Service
 * Service untuk menangani chat AI untuk bidang Perbankan, Sistem Keuangan, dan Perpajakan
 * Re-export dari undangService untuk kompatibilitas dengan P2SKChatPage
 */

import { sendChatMessage, clearChatHistory, initializeSession } from './undangService';

export { sendChatMessage, clearChatHistory, initializeSession }; 