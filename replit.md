# Claude Chat - Typewriter AI Interface

A beautiful, vintage typewriter-styled chat interface for the Anthropic Claude API. Features real-time streaming responses, multiple model selection, and a sophisticated three-state theme system.

## Overview

This full-stack web application provides a custom interface for chatting with Claude AI, styled with a distinctive "old typewriter" aesthetic featuring Courier New typography, bordered cards with hard shadows, and warm gradient backgrounds.

## Recent Changes

**October 21, 2025 - Major UI Redesign**
- **Branding Update:** Changed title from "CLAUDE CHAT" to "Claude Unchained"
- **Full-Screen Layout:** Chat window now expands to full available width with collapsible sidebar
- **Professional Message Design:** User messages aligned right (dark grey), assistant messages aligned left (light grey)
- **Sharp Corners:** All elements use sharp 0px border-radius for clean, modern aesthetic
- **Improved Contrast:** Enhanced light mode readability with darker message bubbles, refined dark mode with subtler user message colors
- **Streamlined Header:** Compact header bar with title, conversation info, and controls

**October 19, 2025 - Initial Release**
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
- **Professional modern design** with Courier New monospace font throughout
- **Sharp corners** on all UI elements (0px border-radius)
- **Full-screen layout** with collapsible sidebar navigation
- **Differentiated message alignment**: User messages right, assistant messages left
- **Warm gradient backgrounds** (paper tones in light, terminal in dark)
- **Three-state theme toggle**: System preference, Light mode, Dark mode
- **Responsive layout** optimized for desktop, tablet, and mobile
- **Accessible interactions** with proper ARIA labels and keyboard support

### Visual Details
- User messages: Right-aligned with light grey background (#C7C7C7) and dark text (#292929) in light mode, dark grey background (#595959) and light text in dark mode
- Assistant messages: Left-aligned with light grey background (#D6D6D6) and white text (#FCFCFC) in light mode, dark grey background (#333333) and light text in dark mode
- Compact header bar with conversation title and controls
- Empty state with chat bubble emoji and "Ready to chat" message
- Loading states with animated blinking cursor (▌)
- Smooth transitions between themes

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
- Foreground: #292929 (dark grey text)
- Primary (User messages): #C7C7C7 (light grey bubble, 78% lightness)
- Primary Foreground (User text): #292929 (dark grey text, 16% lightness)
- Muted (Assistant messages): #D6D6D6 (light grey bubble, 84% lightness)
- Muted Foreground (Assistant text): #FCFCFC (white text, 99% lightness)
- Border: #292929

**Dark Mode:**
- Background: Linear gradient #1a1a1a → #0d0d0d (deep terminal)
- Foreground: #E0E0E0 (light grey text)
- Primary (User messages): #595959 (medium grey, 35% lightness)
- Muted (Assistant messages): #333333 (dark grey, 20% lightness)
- Border: #E0E0E0

### Typography
- All text: 'Courier New', Courier, monospace
- Header title: 1.125rem (18px), bold
- Body: 0.875-1rem, 1.5 line-height
- Message labels: Uppercase, 0.1em letter-spacing, font-semibold

### Layout & Spacing
- Full-screen chat window (max-width 900px centered for readability)
- Message bubbles: max-width 75%, padding 1rem
- Header: Compact with border-bottom separator
- Input area: Centered max-width 900px
- Border-radius: 0px on all elements (sharp corners)

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
- Modern professional aesthetic inspired by official Claude app
- Sharp corners (0px border-radius) on all UI elements
- User messages right-aligned with dark background
- Assistant messages left-aligned with light background  
- Full-width layout with collapsible sidebar
- Courier New monospace font throughout
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