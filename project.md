# POLICE INVESTIGATOR PHIDATA WORKFLOW

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── agent-forms/                # Folder for agent-specific forms
│   │   │   ├── BaseAgentForm.tsx      # Base form component for agents
│   │   │   └── ImageAgentForm.tsx     # Specialized form for image analysis
│   │   ├── ui/                        # UI components
│   │   │   ├── Modal.tsx              # Reusable modal component
│   │   │   ├── label.tsx              # Label component for form elements
│   │   │   └── select.tsx             # Select component for dropdowns
│   │   ├── AgentCard.tsx              # Card component for displaying agents
│   │   ├── AutosizeTextarea.tsx       # Reusable textarea component
│   │   ├── CaseCard.tsx               # Card component for case display
│   │   ├── ProgressSteps.tsx          # Progress indicator component
│   │   ├── ResultArtifact.tsx         # Component for displaying analysis results
│   │   ├── Sidebar.tsx                # Navigation sidebar component
│   │   ├── ThinkingAnimation.tsx      # Loading animation component
│   │   └── WorkflowCard.tsx           # Card component for workflow display
│   │
│   ├── config/
│   │   └── env.ts                     # Environment configuration
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
│   │   ├── Reports.tsx               # Reports management page
│   │   └── PencarianPutusan.tsx      # Court decisions search page
│   │
│   ├── services/
│   │   ├── imageService.ts           # API & Gemini integration services
│   │   ├── agentSpkt.ts             # SPKT report analysis service
│   │   ├── searchPutusanService.ts   # Court decisions search service
│   │   └── supabase.ts              # Supabase client configuration
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
```

## Key Features

1. Investigation Agents:
   [Previous agents section remains the same...]

2. Court Decisions Search:
   - Semantic Search Integration:
     * OpenAI embeddings for semantic similarity
     * Vector search using Supabase pgvector
     * Relevance scoring and ranking
   - Search Features:
     * Case chronology analysis
     * Similarity-based matching
     * Highlighted text matches
     * Progressive search steps
     * Fallback search with lower threshold
   - Results Display:
     * Case metadata presentation
     * Relevance percentage
     * Direct links to documents
     * Tagged categories
     * Matched text segments with highlights

3. Case Management:
   [Previous case management section remains the same...]

4. UI Components:
   - Previous components plus:
     * Progress Steps indicator
     * Responsive search results cards
     * Animated loading states
     * Mobile-optimized layouts

5. State Management:
   - Previous features plus:
     * Search state management
     * Progressive step tracking
     * Error handling for searches
     * Loading states for search operations

6. API Integration:
   - Previous integrations plus:
     * OpenAI Embeddings API
     * Supabase Vector Store
     * Document similarity search
     * File and metadata retrieval

## Components Overview

1. UI Components:
   - Modal: Reusable modal dialog for displaying detailed information
   - Label: Form label component used in agent forms
   - Select: Dropdown select component used in agent forms
   - All UI components follow consistent styling and accessibility patterns

2. Agent Forms:
   - BaseAgentForm: Template for all agent-specific forms
   - ImageAgentForm: Specialized form for image analysis
     - Uses Label and Select components for form controls
     - Custom image preview and analysis options

## Environment Configuration

Required environment variables:
```bash
# Previous environment variables plus:
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENAI_API_KEY=your-openai-key
```

## Type System

Key TypeScript types:
1. Previous types plus:
2. Document Types:
   - LegalDocument interface
   - DocumentMetadata interface
   - SearchResult interface
3. Search Related:
   - OpenAIError interface
   - SupabaseDocument interface
   - ProgressStepsProps interface

## New Components

1. ProgressSteps:
   - Visual step indicator
   - Animated progress tracking
   - Mobile responsive design
   - Status indication (complete, current, pending)

2. Court Decisions Search:
   - Chronology input form
   - Real-time search progress
   - Results card with metadata
   - Document preview and links

3. Search Service:
   - Vector embedding generation
   - Similarity search implementation
   - Results processing and formatting
   - Error handling and fallbacks

## Features

1. Court Decisions Search (PencarianPutusan):
   - Natural language search for relevant court decisions
   - Real-time search progress tracking
   - Interactive search results with metadata display
   - Modal view for detailed document inspection
   - Document content copying and downloading
   - Mobile-responsive design

2. Image Analysis:
   [Previous image analysis section remains the same...]