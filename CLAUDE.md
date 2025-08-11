# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Penyidik Toolkit** - an Indonesian police investigator assistance platform built with React, TypeScript, Vite, and Tailwind CSS. It provides AI-powered tools for case analysis, document search, legal consultation, and investigative workflows.

## Development Commands

### Core Commands
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production (includes TypeScript compilation)
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

### Environment Setup
Copy environment variables from `.env.example` or configure these required variables:
- `VITE_API_KEY` - Main API key for api.reserse.id
- `VITE_SUPABASE_URL` - Supabase database URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_GEMINI_API_KEY` - Google Gemini API key
- `VITE_OPENAI_API_KEY` - OpenAI API key

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Radix UI primitives + custom components
- **State Management**: Zustand for global state
- **Authentication**: Supabase Auth with PKCE flow
- **Database**: Supabase PostgreSQL with vector search
- **File Storage**: Contabo S3 object storage
- **AI Integration**: Multiple LLM providers (Gemini, OpenAI, Flowise)

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── agent-forms/     # AI agent input forms
│   ├── ui/             # Base UI components (buttons, inputs, etc)
│   ├── chat/           # Chat interface components
│   ├── analysis/       # Data visualization components
│   └── [various specialized components]
├── pages/              # Route pages/screens
├── services/           # API integration services
├── data/
│   └── agents/         # AI agent configurations
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── config/             # Environment and configuration
└── utils/              # Utility functions
```

### Key Architectural Patterns

**Agent System**: Each investigative tool is configured as an "agent" with:
- Agent configuration in `src/data/agents/[name]Agent.ts`
- Service implementation in `src/services/[name]Service.ts`
- Optional dedicated page in `src/pages/[Name].tsx`
- Form components in `src/components/agent-forms/`

**Chat Interface Pattern**: Most AI features use the `ChatInterface` component for consistent user experience with streaming responses and source document display.

**Route Protection**: All authenticated routes use `ProtectedRoute` wrapper with Supabase auth.

## AI Agent Integration

### Adding New Agents
1. Create agent config in `src/data/agents/newAgent.ts`
2. Add service in `src/services/newService.ts` 
3. Update `src/data/agents/index.ts` to export the agent
4. Add route to `App.tsx` and navigation to `Sidebar.tsx`

### Agent Configuration Structure
```typescript
export const agentName: ExtendedAgent = {
  id: 'unique_id',
  name: 'Display Name',
  type: 'agent_type',
  status: 'on' | 'off',
  description: 'Brief description',
  fields: [
    {
      id: 'field_name',
      label: 'Field Label',
      type: 'text' | 'textarea' | 'file' | 'select',
      required: true,
      placeholder: 'Placeholder text'
    }
  ],
  icon: LucideIcon,
  iconClassName: 'text-color-500'
}
```

### Service Implementation Pattern
Services typically integrate with:
- **Flowise API** (`https://flow.reserse.id`) for chat-based agents
- **Direct LLM APIs** (Gemini, OpenAI) for specialized processing
- **Supabase** for data storage and retrieval

## Key Components

### Core UI Components
- `ChatInterface` - Main chat component with streaming support
- `AnimatedMessage` - Animated message display with markdown support
- `AgentCard` - Agent selection cards with status indicators
- `FileUploadModal` - File upload with drag-and-drop
- `Sidebar` - Main navigation with user profile

### Specialized Components
- `ProgressSteps` - Multi-step process indicators
- `ResultArtifact` - Analysis result display
- `SentimentChart` / `CrimeTrendChart` - Data visualizations
- `CitationDisplay` - Source document citations

## API Integration

### Authentication Flow
Uses Supabase Auth with:
- Email/password authentication
- User approval workflow (pending → approved)
- Role-based access (admin, user)
- Session management with PKCE

### External APIs
- **Flowise Integration**: Chat-based AI workflows via proxy
- **Supabase**: Database, auth, file storage, vector search
- **Google Gemini**: Vision and text analysis
- **OpenAI**: Embeddings and text processing
- **Contabo S3**: File storage and CDN

### Proxy Configuration
Development server proxies external APIs:
- `/v1/*` → `https://api.reserse.id`
- `/api/*` → `https://flow.reserse.id`
- `/paperless/*` → `https://dokumen.reserse.id`

## Important Development Notes

### Language Context
- **Primary Language**: Indonesian (Bahasa Indonesia)
- **User Interface**: All text, labels, and messages in Indonesian
- **Documentation**: Code comments can be in English, user-facing content in Indonesian

### Styling Conventions
- Uses Tailwind CSS with custom theme
- Custom animations: slideUp, fadeIn, slideLeft, etc.
- Color scheme: Blue primary colors with dark mode support
- Font: Inter as primary sans-serif font

### File Upload Handling
- Maximum file size: 50MB
- Allowed types: PDF, DOC, DOCX, images, spreadsheets
- Storage: Contabo S3 with CDN
- User quota: 1GB per user

### Error Handling
- All API calls should include error boundaries
- User-friendly error messages in Indonesian
- Retry mechanisms for network failures
- Loading states for all async operations

## Testing Strategy

Currently no testing framework is configured. Consider adding:
- Vitest for unit testing
- Testing Library for component tests
- Playwright for E2E tests

## Development Workflow

1. **Feature Development**: Create new agent or enhance existing functionality
2. **Code Quality**: Run `npm run lint` before commits
3. **Build Verification**: Test with `npm run build` before deployment
4. **Environment Testing**: Verify with both development and preview modes

## Security Considerations

- Environment variables properly configured with VITE_ prefix
- API keys stored securely, never committed to code
- User authentication required for all investigative tools
- File uploads validated for type and size
- CORS properly configured for external API access

## Deployment

- **Build Process**: `npm run build` creates production bundle
- **Preview**: `npm run preview` for local production testing
- **PWA Support**: Configured with service worker and manifest
- **Docker**: Dockerfile available for containerized deployment