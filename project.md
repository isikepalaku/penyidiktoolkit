# POLICE INVESTIGATOR PHIDATA WORKFLOW

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── agent-forms/                # Folder for agent-specific forms
│   │   │   ├── BaseAgentForm.tsx      # Base form component for agents
│   │   │   └── ImageAgentForm.tsx     # Specialized form for image analysis
│   │   ├── AgentCard.tsx              # Card component for displaying agents
│   │   ├── AutosizeTextarea.tsx       # Reusable textarea component
│   │   ├── ResultArtifact.tsx         # Component for displaying analysis results
│   │   ├── Sidebar.tsx                # Navigation sidebar component
│   │   └── ThinkingAnimation.tsx      # Loading animation component
│   │
│   ├── data/
│   │   └── agents/
│   │       ├── index.ts               # Exports all agent configurations
│   │       ├── spktAgent.ts           # SPKT report analysis agent
│   │       ├── forensicAgent.ts       # Forensic analysis agent
│   │       ├── behavioralAgent.ts     # Behavioral analysis agent
│   │       ├── witnessAgent.ts        # Witness statement agent
│   │       ├── reportAgent.ts         # Report generation agent
│   │       └── imageAgent.ts          # Image analysis agent
│   │
│   ├── hooks/
│   │   └── useAgentForm.ts           # Custom hook for form management
│   │
│   ├── pages/
│   │   ├── Agents.tsx                # Main container for all agents
│   │   └── Reports.tsx               # Reports management page
│   │
│   ├── services/
│   │   └── agentService.ts           # API integration services
│   │
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   │
│   ├── App.tsx                       # Main application component
│   ├── main.tsx                      # Application entry point
│   ├── index.css                     # Global styles
│   └── vite-env.d.ts                # Vite type declarations
│
├── public/
│   └── vite.svg                      # Vite logo
│
├── .gitignore                        # Git ignore configuration
├── eslint.config.js                  # ESLint configuration
├── package.json                      # Project dependencies
├── postcss.config.js                 # PostCSS configuration
├── project.md                        # Project documentation
├── tailwind.config.js                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── tsconfig.app.json                 # App TypeScript settings
└── vite.config.ts                    # Vite configuration

## Key Features

1. Modular Agent System:
   - Centralized agent configuration
   - Specialized forms per agent type
   - Extensible agent architecture
   - Unified API integration
   - Custom hooks for state management

2. Form Components:
   - Base form component for standard fields
   - Specialized forms for specific agents
   - File upload with preview
   - Dynamic form generation
   - Real-time validation

3. UI Components:
   - Agent selection cards
   - Responsive sidebar
   - Loading animations
   - Result display with markdown support
   - Auto-sizing textarea

4. State Management:
   - Custom hooks for form logic
   - Centralized API services
   - Type-safe state handling
   - Error management
   - Loading states

5. API Integration:
   - Dedicated service layer
   - Type-safe API calls
   - Error handling
   - File upload support
   - Response formatting

6. Development Features:
   - TypeScript for type safety
   - ESLint for code quality
   - Tailwind CSS for styling
   - Vite for fast development
   - Modular component structure

## Backend Integration

The application integrates with a FastAPI backend through endpoints:
- `/v1/playground/agent/run`: For general agent analysis
- `/v1/analyze-image`: For image analysis with file upload

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```