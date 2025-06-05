import { useCallback } from 'react';
import { PlaygroundChatMessage } from '@/types/playground';
import { usePlaygroundStore } from '@/stores/PlaygroundStore';

/**
 * Hook untuk menyediakan action-action umum yang diperlukan dalam chat interface
 * Termasuk fungsi untuk menambah pesan, focus input, dan utilities lainnya
 */
export default function useChatActions() {
  
  /**
   * Membuat pesan baru dengan ID dan timestamp yang otomatis
   * @param message - Message object tanpa ID dan timestamp
   * @returns Message object lengkap dengan ID dan timestamp
   */
  const createMessage = useCallback((message: Omit<PlaygroundChatMessage, 'id' | 'created_at'>): PlaygroundChatMessage => {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: Math.floor(Date.now() / 1000),
      ...message
    };
  }, []);

  /**
   * Fungsi untuk menambahkan pesan baru ke state
   * Otomatis menggenerate ID dan timestamp jika belum ada
   * @param message - Message yang akan ditambahkan
   */
  const addMessage = useCallback((message: PlaygroundChatMessage | Omit<PlaygroundChatMessage, 'id' | 'created_at'>) => {
    // Get store state
    const store = usePlaygroundStore.getState();
    
    const completeMessage: PlaygroundChatMessage = 'id' in message && 'created_at' in message 
      ? message as PlaygroundChatMessage
      : createMessage(message as Omit<PlaygroundChatMessage, 'id' | 'created_at'>);
    
    store.addMessage(completeMessage);
  }, [createMessage]);

  /**
   * Fungsi untuk focus ke chat input element
   * Mencari element dengan data attribute tertentu
   */
  const focusChatInput = useCallback(() => {
    // Delay sedikit untuk memastikan DOM sudah updated
    setTimeout(() => {
      const chatInput = document.querySelector('[data-chat-input="true"]') as HTMLTextAreaElement | HTMLInputElement;
      if (chatInput) {
        chatInput.focus();
      }
    }, 100);
  }, []);

  /**
   * Fungsi untuk scroll ke bottom chat container
   */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      const chatContainer = document.querySelector('[data-chat-container="true"]') as HTMLElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }, []);

  /**
   * Fungsi untuk membersihkan chat input
   */
  const clearChatInput = useCallback(() => {
    const chatInput = document.querySelector('[data-chat-input="true"]') as HTMLTextAreaElement | HTMLInputElement;
    if (chatInput) {
      chatInput.value = '';
      
      // Trigger event untuk memperbarui state React jika diperlukan
      const event = new Event('input', { bubbles: true });
      chatInput.dispatchEvent(event);
      
      // Reset height untuk textarea
      if (chatInput.tagName === 'TEXTAREA') {
        (chatInput as HTMLTextAreaElement).style.height = 'auto';
      }
    }
  }, []);

  return {
    addMessage,
    createMessage,
    focusChatInput,
    scrollToBottom,
    clearChatInput
  };
} 