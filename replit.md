# Claude Chat - Typewriter AI Interface

A beautiful, vintage typewriter-styled chat interface for the Anthropic Claude API. Features real-time streaming responses, multiple model selection, and a sophisticated three-state theme system.

## Overview

This full-stack web application provides a custom interface for chatting with Claude AI, styled with a distinctive "old typewriter" aesthetic featuring Courier New typography, bordered cards with hard shadows, and warm gradient backgrounds.

## Recent Changes

**October 19, 2025**
- Initial implementation with complete MVP functionality
- Built schema-first architecture with TypeScript interfaces
- Implemented all frontend components with exceptional visual polish
- Created streaming backend endpoint with Anthropic SDK integration
- Added three-state theme system (auto/light/dark)
- Integrated Server-Sent Events for real-time response streaming
- Comprehensive e2e testing completed successfully

## Features

### Core Functionality
- **Real-time streaming chat** with Claude AI models
- **Model selection dropdown** for choosing between:
  - Claude 4.1 Opus (claude-opus-4-20250514)
  - Claude 4.5 Sonnet (claude-sonnet-4-5)
  - Claude 4.5 Haiku (claude-haiku-4-5)
- **Conversation history** maintained within each session
- **Auto-scrolling chat window** that follows new messages
- **Streaming indicator** with typewriter cursor animation

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
  - `ThemeToggle.tsx` - Three-state theme system with localStorage
  - `ModelSelector.tsx` - Dropdown for Claude model selection
  - `ChatWindow.tsx` - Scrollable message history container
  - `ChatMessage.tsx` - Individual message bubble component
  - `ChatInput.tsx` - Auto-resizing textarea with send button
- **Pages:**
  - `Chat.tsx` - Main chat interface with state management
- **Styling:**
  - `index.css` - Typewriter color tokens and elevation utilities
  - `tailwind.config.ts` - Design system configuration

### Backend (`server/`)
- **Routes:**
  - `POST /api/chat` - Streaming chat endpoint with SSE
- **Services:**
  - `anthropic.ts` - Claude API client initialization
- **Features:**
  - Zod validation for request data
  - Conversation history support
  - Error handling with appropriate status codes

### Shared (`shared/`)
- `schema.ts` - TypeScript types and Zod schemas for messages and requests

## Technology Stack

- **Frontend:** React, TypeScript, Wouter (routing), TailwindCSS
- **Backend:** Express.js, Node.js
- **AI:** Anthropic Claude API (via @anthropic-ai/sdk)
- **Streaming:** Server-Sent Events (SSE)
- **Validation:** Zod
- **Styling:** Custom CSS variables + Tailwind utilities

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for Claude API access (stored in Replit Secrets)
- `SESSION_SECRET` - Session management (pre-configured)

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

## User Preferences

The application uses localStorage to persist:
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

## Future Enhancements

Potential additions for future development:
- Conversation persistence across sessions
- Message editing and regeneration
- Conversation export (markdown/text)
- System prompt customization
- Message copying and formatting options
- Conversation search/filtering
- Multi-conversation management

## Notes

- This application prioritizes visual excellence and user experience
- The typewriter aesthetic is purely CSS-based (no images required)
- All components follow the design guidelines for consistent styling
- Streaming responses provide immediate feedback for better UX
- Theme system respects system preferences by default