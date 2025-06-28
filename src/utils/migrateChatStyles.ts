// Migration utility to update all chat components to use unified styles
// This script demonstrates the pattern for migrating to clean ChatGPT-like design

export const chatComponentMigrationInstructions = {
  title: "Migrasi ke Unified Chat Styles - ChatGPT-like Design",
  description: "Menghilangkan warna-warna spesifik dan menggunakan design yang clean",
  
  // Files yang perlu diupdate
  targetFiles: [
    'src/components/ui/ITEChatPage.tsx',
    'src/components/ui/TipidkorChatPage.tsx', 
    'src/components/ui/P2SKChatPage.tsx',
    'src/components/ui/SiberChatPage.tsx',
    'src/components/ui/TipidterChatPage.tsx',
    'src/components/ui/FismondevChatPage.tsx',
    'src/components/ui/IndagsiChatPage.tsx',
    'src/components/ui/EMPChatPage.tsx',
        'src/components/ui/WassidikChatPage.tsx',
    'src/components/ui/PpaPpoChatPage.tsx',
    'src/components/ui/BantekChatPage.tsx',
    'src/components/ui/KUHAPChatPage.tsx',
    'src/components/ui/CiptaKerjaChatPage.tsx',
    'src/components/ui/PerkabaChatPage.tsx',
    'src/components/ui/NarkotikaChatPage.tsx',
    'src/components/ui/ReskrimumChatPage.tsx',
    'src/components/ui/UndangChatPage.tsx',
    'src/components/ui/FiduciaChatPage.tsx'
  ],
  
  // Pattern yang sudah berhasil di KUHPChatPage.tsx
  migrationSteps: {
    step1: {
      title: "1. Import unified styles",
      pattern: `
import { 
  chatStyles, 
  getProseClasses, 
  getUserMessageClasses, 
  getAgentMessageClasses, 
  getSendButtonClasses 
} from '@/styles/chatStyles';
      `
    },
    
    step2: {
      title: "2. Replace user message styling",
      before: "bg-[COLOR] text-white atau bg-gray-100 text-gray-900",
      after: "getUserMessageClasses()"
    },
    
    step3: {
      title: "3. Replace agent message styling", 
      before: "bg-white border border-gray-200 text-gray-900",
      after: "getAgentMessageClasses()"
    },
    
    step4: {
      title: "4. Replace agent avatar styling",
      before: "bg-[COLOR]-100 atau text-[COLOR]-600",
      after: "chatStyles.agentAvatar.shape + ' ' + chatStyles.agentAvatar.background"
    },
    
    step5: {
      title: "5. Replace user avatar styling",
      before: "bg-gray-200 atau bg-gray-500",
      after: "chatStyles.userAvatar.shape + ' ' + chatStyles.userAvatar.background"
    },
    
    step6: {
      title: "6. Replace prose styling",
      before: "prose-headings:text-[COLOR]-800 atau prose-th:bg-[COLOR]-50",
      after: "getProseClasses()"
    },
    
    step7: {
      title: "7. Replace send button styling",
      before: "bg-[COLOR]-600 hover:bg-[COLOR]-700",
      after: "getSendButtonClasses(disabled)"
    },
    
    step8: {
      title: "8. Replace input styling",
      before: "focus:border-[COLOR]-500 focus:ring-[COLOR]-500",
      after: "chatStyles.input.border dan chatStyles.input.focus"
    },
    
    step9: {
      title: "9. Replace storage/action button styling",
      before: "text-[COLOR]-600 hover:text-[COLOR]-500",
      after: "chatStyles.storage.cleanup atau chatStyles.storage.button"
    }
  },
  
  // Benefits dari unified design
  benefits: [
    "✅ Konsistensi visual across semua agents",
    "✅ Clean, professional appearance seperti ChatGPT", 
    "✅ Mudah maintenance dan update",
    "✅ Reduced cognitive load untuk users",
    "✅ Better accessibility dengan kontras yang konsisten",
    "✅ Focused UX tanpa distraksi warna",
    "✅ Professional appearance untuk aplikasi police"
  ],
  
  // Color schemes yang dihilangkan
  removedColorSchemes: {
    KUHP: "rose/red theme (bg-rose-100, text-rose-600, prose-headings:text-rose-800)",
    ITE: "cyan theme (bg-cyan-600, text-cyan-600, prose-headings:text-cyan-800)",
        TIPIDKOR: "red theme (text-red-600, prose-headings:text-red-800)",
    EMP: "amber theme (bg-amber-600, prose-headings:text-amber-800)",
    P2SK: "blue theme (text-blue-600, prose-headings:text-blue-800)",
    Wassidik: "purple theme (bg-purple-100, prose-headings:text-purple-800)",
    Fismondev: "green theme (bg-green-100, prose-headings:text-green-800)",
    Indagsi: "purple theme (prose-headings:text-purple-800)",
    Perkaba: "purple theme variations",
    Others: "Various inconsistent color schemes"
  },
  
  // Unified color palette (ChatGPT-like)
  unifiedPalette: {
    userMessages: "White background (#FFFFFF) dengan gray border",
    agentMessages: "Light gray background (#F7F7F8) dengan subtle border",
    userAvatar: "Gray background (#E5E7EB) dengan gray text (#374151)",
    agentAvatar: "Light gray background (#F3F4F6) dengan gray text (#6B7280)",
    text: "Gray scale untuk semua text (gray-900, gray-700, gray-600)",
    sendButton: "Dark gray (gray-700) dengan gray-800 hover",
    inputFocus: "Gray-500 focus ring untuk clean appearance",
    links: "Blue-600 untuk links (standard web convention)",
    headers: "Gray-900 untuk headers tanpa warna spesifik"
  }
};

// Helper function untuk validasi setelah migrasi
export const validateMigration = (componentCode: string): boolean => {
  const colorPatterns = [
    /bg-(rose|cyan|emerald|amber|purple|red|green|blue|indigo|pink|orange)-\d+/g,
    /text-(rose|cyan|emerald|amber|purple|red|green|blue|indigo|pink|orange)-\d+/g,
    /prose-headings:text-(rose|cyan|emerald|amber|purple|red|green|blue|indigo|pink|orange)-\d+/g,
    /focus:border-(rose|cyan|emerald|amber|purple|red|green|blue|indigo|pink|orange)-\d+/g
  ];
  
  return !colorPatterns.some(pattern => pattern.test(componentCode));
};

// Export migration instructions untuk dokumentasi
export default chatComponentMigrationInstructions; 