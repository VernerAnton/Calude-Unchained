# Claude Chat - Typewriter AI Interface

## Overview

This full-stack web application provides a custom, vintage typewriter-styled interface for interacting with Anthropic's Claude AI. It features real-time streaming responses, multi-model selection, conversation management, and a sophisticated three-state theme system. The project aims to offer a unique and aesthetically pleasing chat experience with advanced AI capabilities.

## User Preferences

I prefer iterative development, so please provide solutions step-by-step. I value clear, concise explanations and prefer to be asked before any major changes are made to the codebase. Ensure that all UI/UX decisions align with a professional, modern aesthetic featuring sharp corners and a full-screen layout.

## System Architecture

### UI/UX Decisions
The application features a professional, modern design with a distinctive "old typewriter" aesthetic.
- **Typography**: 'Courier New' monospace font is used throughout the application.
- **Color Scheme**: Three-state theme toggle (System preference, Light, Dark) with warm gradient backgrounds (paper tones in light, deep terminal in dark).
- **Layout**: Full-screen layout with a collapsible sidebar for navigation. User messages are right-aligned, and assistant messages are left-aligned, both without background bubbles for a clean look. All UI elements have sharp, 0px border-radius.
- **Responsiveness**: Optimized for desktop, tablet, and mobile.
- **Accessibility**: Proper ARIA labels and keyboard support are implemented.

### Technical Implementations
- **Frontend**: Built with React, TypeScript, Wouter for routing, TailwindCSS for styling, and TanStack Query for data management. Shadcn UI components are utilized for consistent design.
- **Backend**: Implemented using Express.js and Node.js.
- **Database**: PostgreSQL (Neon) with Drizzle ORM for type-safe database interactions.
- **AI Integration**: Anthropic Claude API via `@anthropic-ai/sdk`, with all API calls proxied through the backend for security. Server-Sent Events (SSE) are used for real-time streaming responses.
- **Validation**: Zod is used for request data validation.
- **Conversation Management**: Supports multiple conversations, system prompt customization per conversation, and message actions (edit, regenerate, delete).
- **Threads & Branching**: Non-destructive editing creates new sibling branches, preserving history. Branch navigation allows switching between message versions. Isolated side panels support threaded conversations from any assistant message, with context isolation for API calls.

### Feature Specifications
- Real-time streaming chat with Claude AI models (Opus, Sonnet, Haiku).
- Multi-conversation management with persistence in PostgreSQL.
- Auto-scrolling chat window and streaming indicator with typewriter cursor animation.
- Custom system prompts per conversation.
- Export conversations as Markdown or plain text.
- Display of Claude model used for each assistant message.
- File attachment support for images, PDFs, and text/code files, processed intelligently for Claude.
- Branch navigation and isolated thread conversations for complex discussions.

### System Design Choices
- **Schema-first architecture**: Ensures type safety across frontend and backend.
- **Drizzle ORM**: Provides type-safe database queries.
- **Server-Sent Events**: Used for efficient one-way streaming communication.
- **Database Schema**: `conversations`, `messages`, `messageFiles`, `projects`, and `projectFiles` tables with appropriate relationships and cascade deletes. `parentMessageId` in the `messages` table supports conversation branching. `messageFiles` stores file attachments with base64 data for images/PDFs and extracted content for text files.

## External Dependencies

- **AI Service**: Anthropic Claude API (`@anthropic-ai/sdk`)
- **Database**: PostgreSQL (specifically Neon for cloud deployment)
- **UI Components**: Shadcn UI (built on Radix UI primitives)
- **Frontend Routing**: Wouter
- **Data Fetching/Caching**: TanStack Query
- **Styling Framework**: TailwindCSS
- **Validation Library**: Zod