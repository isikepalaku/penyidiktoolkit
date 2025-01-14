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
│   │   ├── CaseCard.tsx               # Card component for case display
│   │   ├── ResultArtifact.tsx         # Component for displaying analysis results
│   │   ├── Sidebar.tsx                # Navigation sidebar component
│   │   ├── ThinkingAnimation.tsx      # Loading animation component
│   │   └── WorkflowCard.tsx           # Card component for workflow display
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
│   ├── utils/
│   │   └── agentUtils.ts             # Utility functions for agents
│   │
│   ├── App.tsx                       # Main application component
│   ├── main.tsx                      # Application entry point
│   ├── index.css                     # Global styles
│   └── vite-env.d.ts                # Vite type declarations
│
├── public/
│   └── vite.svg                      # Vite logo
│
├── index.html                        # Main HTML entry point
├── README.md                         # Project documentation
├── .env                              # Environment variables
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore configuration
├── eslint.config.js                  # ESLint configuration
├── package.json                      # Project dependencies
├── package-lock.json                 # Dependency lock file
├── postcss.config.js                 # PostCSS configuration
├── project.md                        # Project documentation
├── tailwind.config.js                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── tsconfig.app.json                 # App TypeScript settings
├── tsconfig.node.json                # Node TypeScript settings
└── vite.config.ts                    # Vite configuration

## Key Features

1. Investigation Agents:
   - SPKT Report Analysis:
     * Kronologis kasus analysis
     * Object, subject, locus, and tempus extraction
     * Structured report generation
   - Forensic Analysis:
     * Evidence analysis
     * Technical assessment
     * Forensic recommendations
   - Behavioral Analysis:
     * Subject behavior patterns
     * Psychological insights
     * Behavioral recommendations
   - Witness Statement Analysis:
     * Statement credibility assessment
     * Key information extraction
     * Cross-reference suggestions
   - Report Generation:
     * Structured report creation
     * Key findings summary
     * Investigation recommendations
   - Image Analysis:
     * Integration with Google's Gemini Vision AI
     * Visual evidence analysis
     * Object and text detection
     * Forensic insights

2. Case Management:
   - Case tracking and organization
   - Priority levels (high, medium, low)
   - Status tracking (open, in progress, closed)
   - Case details and updates
   - Assignment tracking

3. Form Components:
   - Base form component for standard fields
   - Specialized forms per agent type
   - Dynamic form validation
   - File upload with preview
   - Auto-sizing text inputs
   - Real-time error handling

4. UI Components:
   - Agent selection cards
   - Case display cards
   - Workflow visualization
   - Interactive sidebar navigation
   - Loading animations
   - Result display with formatting
   - Image preview functionality

5. State Management:
   - Custom form handling hooks
   - Type-safe state management
   - Error handling and display
   - Loading state management
   - File and preview handling

6. API Integration:
   - Backend FastAPI integration
   - Gemini Vision AI integration
   - Error handling and retries
   - Stream processing
   - Response formatting

## Environment Configuration

Required environment variables:
```bash
VITE_API_KEY=your-api-key           # Backend API key
VITE_API_URL=http://localhost:8000  # Backend URL
VITE_GEMINI_API_KEY=your-key        # Google Gemini API key
```

## Setup Instructions

1. Clone and setup environment:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure environment variables
   # Edit .env file with your API keys
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Development:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## API Integration Details

1. Backend FastAPI Endpoints:
   - `/v1/playground/agent/run`:
     * Method: POST
     * Purpose: General agent analysis
     * Parameters:
       - message: Input text for analysis
       - agent_id: Specific agent identifier
       - stream: Enable/disable streaming response
       - monitor: Enable/disable monitoring

   - `/v1/analyze-image`:
     * Method: POST
     * Purpose: Image analysis
     * Parameters:
       - image_file: Image for analysis
       - description: Optional image description
       - prompt_type: Analysis mode

2. Google Gemini Vision AI:
   - Direct integration for image analysis
   - Custom prompt templates
   - Multiple analysis modes
   - Advanced vision capabilities

## Type System

Key TypeScript types:
1. Agent Types:
   - Base Agent interface
   - ExtendedAgent with fields
   - Agent field configurations

2. Case Management:
   - Case interface with status
   - Priority and Status types
   - Assignment tracking

3. Form Handling:
   - FormData interface
   - FormDataValue types
   - Field configurations