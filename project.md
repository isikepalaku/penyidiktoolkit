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
│   │       └── imageAgent.ts          # Image analysis agent config & prompts
│   │
│   ├── hooks/
│   │   └── useAgentForm.ts           # Custom hook for form management
│   │
│   ├── pages/
│   │   ├── Agents.tsx                # Main container for all agents
│   │   └── Reports.tsx               # Reports management page
│   │
│   ├── services/
│   │   └── agentService.ts           # API & Gemini integration services
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
├── .env                              # Environment variables
├── .env.example                      # Environment variables template
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

1. AI Image Analysis:
   - Integration with Google's Gemini Vision AI
   - Advanced image analysis capabilities
   - Multiple analysis modes (Standard & Forensic)
   - Detailed visual analysis and text recognition
   - Forensic insight extraction
   - Customizable analysis prompts

2. Modular Agent System:
   - Centralized agent configuration
   - Specialized forms per agent type
   - Extensible agent architecture
   - Custom hooks for state management
   - Type-safe prompt management

3. Form Components:
   - Base form component for standard fields
   - Specialized forms for specific agents
   - File upload with preview
   - Dynamic form generation
   - Real-time validation
   - Prompt type selection

4. UI Components:
   - Agent selection cards
   - Responsive sidebar
   - Loading animations
   - Result display with markdown support
   - Auto-sizing textarea
   - Image preview functionality

5. State Management:
   - Custom hooks for form logic
   - Type-safe state handling
   - Error management
   - Loading states
   - File preview handling

6. API Integration:
   - Gemini Vision AI integration
   - Error handling
   - File upload support
   - Retry mechanisms
   - Response formatting

7. Environment Configuration:
   - Secure API key management
   - Environment-based configuration
   - Example configuration templates

## Development Features:
   - TypeScript for type safety
   - ESLint for code quality
   - Tailwind CSS for styling
   - Vite for fast development
   - Modular component structure
   - Environment variable management

## Setup Instructions

1. Environment Setup:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Fill in the required API keys:
   # - VITE_API_KEY: For backend API
   # - VITE_GEMINI_API_KEY: For Gemini Vision AI
   # - VITE_API_URL: Backend URL
   ```

2. Install dependencies:
   ```bash
   npm install
   
   # Required packages for Gemini integration:
   npm install @google/generative-ai
   ```

3. Development:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Image Analysis Features

1. Standard Analysis:
   - Detailed object detection
   - Text recognition
   - Pattern identification
   - Visual element analysis
   - Context interpretation
   - Investigative recommendations

2. Forensic Analysis:
   - Advanced metadata analysis
   - Digital manipulation detection
   - Technical quality assessment
   - Critical detail observation
   - Environmental context analysis
   - Forensic investigation recommendations

## API Integration

The application integrates with two main services:
1. Backend FastAPI:
   - `/v1/playground/agent/run`: For general agent analysis
   - `/v1/analyze-image`: For image analysis with file upload

2. Google Gemini Vision AI:
   - Direct integration for image analysis
   - Advanced vision capabilities
   - Custom prompt templates
   - Specialized analysis modes