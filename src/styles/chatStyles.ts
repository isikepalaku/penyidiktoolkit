// Unified Chat Styles Configuration
// Based on ChatGPT design for clean, professional appearance

export const chatStyles = {
  // Message containers
  userMessage: {
    background: 'bg-white', // White background for user messages
    text: 'text-gray-900',
    border: 'border border-gray-200',
    borderRadius: 'rounded-xl',
    alignment: 'ml-auto'
  },
  
  agentMessage: {
    background: 'bg-gray-50', // Light gray background for agent messages
    text: 'text-gray-900',
    border: 'border border-gray-100',
    borderRadius: 'rounded-xl'
  },
  
  // Avatar styles
  userAvatar: {
    background: 'bg-gray-200',
    text: 'text-gray-700',
    shape: 'rounded-lg h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1'
  },
  
  agentAvatar: {
    background: 'bg-gray-100',
    text: 'text-gray-600',
    shape: 'rounded-lg h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1'
  },
  
  // Input area
  input: {
    border: 'border-gray-300',
    focus: 'focus:border-gray-500 focus:ring-gray-500',
    background: 'bg-white',
    text: 'text-gray-900',
    placeholder: 'placeholder:text-gray-500'
  },
  
  // Send button
  sendButton: {
    enabled: 'bg-gray-700 text-white hover:bg-gray-800',
    disabled: 'bg-gray-200 text-gray-400 cursor-not-allowed'
  },
  
  // Prose styling (consistent gray theme)
  prose: {
    base: 'prose prose-sm max-w-none md:prose-base lg:prose-lg overflow-x-auto',
    headings: 'prose-headings:font-bold prose-headings:text-gray-900 prose-headings:my-4',
    headingSizes: 'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
    paragraphs: 'prose-p:my-2 prose-p:text-gray-700',
    lists: 'prose-ul:pl-6 prose-ul:my-2 prose-ol:pl-6 prose-ol:my-2 prose-li:my-1',
    tables: 'prose-table:border-collapse prose-table:my-4',
    tableHeaders: 'prose-th:bg-gray-50 prose-th:p-2 prose-th:border prose-th:border-gray-300',
    tableCells: 'prose-td:p-2 prose-td:border prose-td:border-gray-300',
    text: 'prose-strong:font-bold prose-strong:text-gray-800',
    links: 'prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800'
  },
  
  // Error states
  error: {
    background: 'bg-red-50',
    text: 'text-red-800',
    border: 'border border-red-200'
  },
  
  // Loading states
  loading: {
    background: 'bg-white',
    text: 'text-gray-800',
    border: 'border border-gray-200'
  },
  
  // Storage stats (consistent theme)
  storage: {
    button: 'text-gray-500 hover:text-gray-700',
    cleanup: 'text-blue-600 hover:text-blue-500',
    progress: {
      low: 'bg-green-500',
      medium: 'bg-yellow-500',
      high: 'bg-red-500'
    }
  },
  
  // Header and UI elements
  header: {
    background: 'bg-white',
    border: 'border-b border-gray-200',
    text: 'text-gray-900',
    subtitle: 'text-gray-600'
  }
};

// Helper function to combine all prose classes
export const getProseClasses = () => {
  const { prose } = chatStyles;
  return `${prose.base} ${prose.headings} ${prose.headingSizes} ${prose.paragraphs} ${prose.lists} ${prose.tables} ${prose.tableHeaders} ${prose.tableCells} ${prose.text} ${prose.links}`;
};

// Helper function to get user message classes
export const getUserMessageClasses = () => {
  const { userMessage } = chatStyles;
  return `px-4 py-3 ${userMessage.borderRadius} break-words ${userMessage.background} ${userMessage.text} ${userMessage.alignment}`;
};

// Helper function to get agent message classes
export const getAgentMessageClasses = () => {
  const { agentMessage } = chatStyles;
  return `px-4 py-3 ${agentMessage.borderRadius} break-words ${agentMessage.background} ${agentMessage.text} ${agentMessage.border}`;
};

// Helper function to get send button classes
export const getSendButtonClasses = (disabled: boolean) => {
  const { sendButton } = chatStyles;
  return `absolute right-2 bottom-3 p-2 rounded-lg ${disabled ? sendButton.disabled : sendButton.enabled}`;
}; 