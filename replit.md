# Claude Chat - Typewriter AI Interface

A beautiful, vintage typewriter-styled chat interface for the Anthropic Claude API. Features real-time streaming responses, multiple model selection, and a sophisticated three-state theme system.

## Overview

This full-stack web application provides a custom interface for chatting with Claude AI, styled with a distinctive "old typewriter" aesthetic featuring Courier New typography, bordered cards with hard shadows, and warm gradient backgrounds.

## Recent Changes

**October 19, 2025 - Final Release**
- **Database Implementation:** PostgreSQL with conversations and messages tables
- **Multi-Conversation Management:** Shadcn sidebar with conversation list and navigation
- **Conversation Persistence:** Auto-save messages to database after streaming
- **Message Actions:** Edit, regenerate, and delete functionality with confirmation dialogs
- **System Prompt Customization:** Per-conversation custom system prompts with UI indicator
- **Export Functionality:** Download conversations as Markdown or plain text files
- **Model Display:** Each assistant message shows which Claude model generated it
- **Critical Bug Fix:** Corrected apiRequest function signature (url, options) pattern
- **E2E Testing:** Comprehensive Playwright tests passed for all features

## Features

### Core Functionality
- **Real-time streaming chat** with Claude AI models
- **Model selection dropdown** for choosing between:
  - Claude 4.1 Opus (claude-opus-4-20250514)
  - Claude 4.5 Sonnet (claude-sonnet-4-5)
  - Claude 4.5 Haiku (claude-haiku-4-5)
- **Multi-conversation management** with sidebar navigation
- **PostgreSQL persistence** - conversations and messages saved to database
- **Auto-scrolling chat window** that follows new messages
- **Streaming indicator** with typewriter cursor animation
- **Message actions:** Edit user messages, regenerate assistant responses, delete any message
- **System prompt customization** - set custom prompts per conversation
- **Export conversations** - download as Markdown or plain text files
- **Model labels** - each assistant message displays which Claude model was used

### Design & UX
- **Typewriter aesthetic** with Courier New monospace font throughout
- **Hard-edged borders** with signature 4px solid shadows
- **Warm gradient backgrounds** (paper tones in light, terminal in dark)
- **Three-state theme toggle**: System preference, Light mode, Dark mode
- **Responsive layout** optimized for desktop, tablet, and mobile
- **Accessible interactions** with proper ARIA labels and keyboard support

### Visual Details
- Message bubbles with distinct user/assistant styling
- Empty state with centered "READY TO CHAT" message
- Loading states with animated blinking cursor (▌)
- Beautiful hover states with extended shadows
- Smooth transitions between themes (0.3s ease)

## Project Architecture

### Frontend (`client/src/`)
- **Components:**
  - `AppSidebar.tsx` - Shadcn sidebar with conversation list and NEW CHAT button
  - `ThemeToggle.tsx` - Three-state theme system with localStorage
  - `ModelSelector.tsx` - Dropdown for Claude model selection
  - `SystemPromptDialog.tsx` - Dialog for setting custom system prompts
  - `ExportButton.tsx` - Dropdown menu for exporting conversations
  - `ChatWindow.tsx` - Scrollable message history container
  - `ChatMessage.tsx` - Individual message bubble component with model labels
  - `MessageActions.tsx` - Edit, regenerate, and delete action buttons
  - `ChatInput.tsx` - Auto-resizing textarea with send button
- **Pages:**
  - `Chat.tsx` - Main chat interface with conversation loading and state management
- **Styling:**
  - `index.css` - Typewriter color tokens and elevation utilities
  - `tailwind.config.ts` - Design system configuration

### Backend (`server/`)
- **Routes:**
  - `GET /api/conversations` - List all conversations
  - `POST /api/conversations` - Create new conversation
  - `GET /api/conversations/:id` - Get single conversation
  - `PATCH /api/conversations/:id` - Update conversation (title, systemPrompt)
  - `DELETE /api/conversations/:id` - Delete conversation (cascades to messages)
  - `GET /api/conversations/:id/messages` - Get messages for conversation
  - `POST /api/messages` - Create new message
  - `DELETE /api/messages/:id` - Delete single message
  - `POST /api/chat` - Streaming chat endpoint with SSE
- **Services:**
  - `anthropic.ts` - Claude API client initialization
  - `storage.ts` - IStorage interface with MemStorage implementation
  - `db.ts` - Drizzle ORM database connection
- **Features:**
  - Zod validation for all request data
  - Conversation history support
  - System prompt integration
  - Database persistence with Drizzle ORM
  - Error handling with appropriate status codes

### Shared (`shared/`)
- `schema.ts` - Drizzle ORM schema definitions:
  - `conversations` table (id, title, systemPrompt, createdAt, updatedAt)
  - `messages` table (id, conversationId, role, content, model, createdAt)
  - Zod insert/select schemas for type safety
  - TypeScript types for frontend/backend consistency

## Technology Stack

- **Frontend:** React, TypeScript, Wouter (routing), TailwindCSS, TanStack Query
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL (Neon) with Drizzle ORM
- **AI:** Anthropic Claude API (via @anthropic-ai/sdk)
- **UI Components:** Shadcn UI (Radix UI primitives)
- **Streaming:** Server-Sent Events (SSE)
- **Validation:** Zod
- **Styling:** Custom CSS variables + Tailwind utilities

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for Claude API access (stored in Replit Secrets)
- `DATABASE_URL` - PostgreSQL connection string (automatically configured)
- `SESSION_SECRET` - Session management (pre-configured)
- `PG*` variables - PostgreSQL connection details (automatically configured)

## Design System

### Color Palette
**Light Mode:**
- Background: Linear gradient #f4f1ea → #ebe7db (warm paper)
- Foreground: #2a2a2a (ink black)
- Card: #fefdfb (fresh paper)
- Borders/Shadows: #2a2a2a

**Dark Mode:**
- Background: Linear gradient #1a1a1a → #0d0d0d (deep terminal)
- Foreground: #e0e0e0 (phosphor glow)
- Card: #2a2a2a (charcoal)
- Borders/Shadows: #e0e0e0

### Typography
- All text: 'Courier New', Courier, monospace
- Titles: 2.5rem (responsive to 1.5rem), bold, 0.05em letter-spacing
- Body: 0.875-1rem, 1.3-1.5 line-height
- Labels: Uppercase, 0.1em letter-spacing

### Spacing & Shadows
- Standard spacing: 0.5rem, 1rem, 1.5rem, 2rem increments
- Signature shadow: 4px 4px 0px (theme color)
- Hover shadow: 6px 6px 0px (theme color)
- No border-radius (hard edges throughout)

## Data Persistence

**Database:**
- All conversations and messages stored in PostgreSQL
- Cascade delete ensures message cleanup when conversation is deleted
- Timestamps track creation and updates

**LocalStorage:**
- Theme preference (system/light/dark)
- Automatically applies saved theme on page load to prevent flash

## Running the Project

The application runs automatically via the "Start application" workflow:
```bash
npm run dev
```

This starts:
- Express server on port 5000 (backend)
- Vite dev server (frontend, proxied through Express)

## API Integration

The app integrates with Anthropic's Claude API using the official SDK. All API calls are proxied through the backend to keep the API key secure. The streaming implementation uses Claude's messages.stream() method for real-time token-by-token responses.

**Features:**
- Conversation history support (full context passed to Claude)
- Custom system prompts applied per conversation
- Model selection persisted with each message
- Automatic conversation creation on first message
- Message title generation from first user message (max 50 chars)

## Completed Features

All originally planned features have been implemented:
- ✅ Conversation persistence across sessions
- ✅ Message editing and regeneration
- ✅ Conversation export (markdown/text)
- ✅ System prompt customization
- ✅ Multi-conversation management

## Potential Future Enhancements

- Message copying and formatting options
- Conversation search/filtering
- Conversation folders/tags
- Conversation sharing (read-only links)
- Message attachments (images, files)
- Code syntax highlighting in messages
- Conversation templates
- Keyboard shortcuts
- Dark/light theme per conversation

## Implementation Notes

**Visual Design:**
- Typewriter aesthetic is purely CSS-based (no images required)
- All components follow strict design guidelines for consistent styling
- Hard edges (no border-radius), 4px shadows, Courier New font throughout
- Streaming responses provide immediate feedback for better UX
- Theme system respects system preferences by default

**Technical Decisions:**
- Schema-first architecture ensures type safety across frontend/backend
- Drizzle ORM provides type-safe database queries
- TanStack Query handles caching and optimistic updates
- Server-Sent Events for efficient streaming (one-way communication)
- Shadcn UI components maintain consistent typewriter aesthetic
- apiRequest function follows standard fetch(url, options) pattern

**Database Design:**
- Serial IDs for simplicity and performance
- Cascade delete from conversations to messages
- System prompt nullable (null = use default Claude behavior)
- Model stored with each message for historical tracking
- Timestamps enable sorting and display

**Testing:**
- Comprehensive E2E tests with Playwright
- Database verification included in test plan
- UI interactions tested with data-testid attributes
- Streaming behavior validated end-to-end