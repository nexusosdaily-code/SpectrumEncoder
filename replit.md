# Visual Signal Encoder/Decoder

## Overview

A web-based application that encodes text messages into visual color signal sequences and decodes them back. The system maps each letter of the alphabet (A-Z) to a specific color in the visible spectrum, creating animated color sequences that can be used for visual communication. The application features real-time encoding/decoding, adjustable timing parameters, and an interactive timeline-based visualization inspired by audio/video editing tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 15, 2025 - Saved Message Library Feature
**Implemented persistent message storage with update capability:**
- PostgreSQL database integration with automatic fallback to in-memory storage when DATABASE_URL is unavailable
- Sidebar UI displaying all saved messages with timing parameters (TS, TG values)
- Full CRUD operations: Create (POST), Read (GET), Update (PATCH), Delete (DELETE)
- Smart update workflow:
  - After saving a new message, `loadedMessageId` is automatically set to enable subsequent updates
  - Editing and re-encoding a loaded message preserves `loadedMessageId` for PATCH updates
  - Clear button resets `loadedMessageId` to start a fresh message (POST)
  - No accidental duplicates: edit cycles use PATCH, not POST
- Button states reflect workflow: "Encode to Save" → "Save to Library" → "Update in Library"
- Comprehensive error handling with toast notifications for save/update/delete failures
- Lazy database initialization with Proxy pattern - server boots gracefully without DATABASE_URL

**Design Decision:** Clear button resets `loadedMessageId` because clearing represents "start a new message", not "continue editing". Users who want to update existing messages should edit directly without clearing.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **React 18** with TypeScript for UI components
- **Vite** as the build tool and development server
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **Tailwind CSS** with custom Material Design 3-inspired theme system
- **Radix UI** for accessible component primitives
- **shadcn/ui** component library (New York style variant)

**Design Rationale:**
- React with TypeScript provides type safety and component reusability
- Vite offers fast development with HMR and optimized production builds
- Wouter chosen for minimal routing needs (single-page application with simple navigation)
- TanStack Query handles API calls with built-in caching, though current implementation uses minimal server interaction
- Tailwind enables rapid UI development with consistent spacing and responsive design
- Radix UI ensures accessibility compliance without additional effort

**Component Structure:**
- Modular component architecture with separation between UI primitives (`/components/ui`) and application-specific components
- Custom components: `EncoderSection`, `DecoderSection`, `ColorSignalVisualizer`, `AnimationControls`, `ParameterControls`, `AppSidebar`
- Shadcn sidebar for saved messages library with collapsible navigation
- Theme system with dark mode as the primary design target
- Path aliases configured for clean imports (`@/` for client source, `@shared/` for shared types)

**State Management:**
- Local React state for UI interactions and animation control
- TanStack Query for server state (saved messages) with automatic cache invalidation
- `loadedMessageId` state tracks current message for proper update workflow
- Real-time encoding/decoding calculations performed client-side

### Backend Architecture

**Technology Stack:**
- **Express.js** with TypeScript for REST API
- **PostgreSQL** database with graceful fallback to **MemStorage**
- **Drizzle ORM** for type-safe database operations
- **Lazy database initialization** prevents crashes when DATABASE_URL is missing

**Design Rationale:**
- Express provides lightweight HTTP server with straightforward routing
- Smart storage layer: uses PostgreSQL when DATABASE_URL exists, falls back to in-memory storage otherwise
- RESTful API design for CRUD+Update operations on saved messages
- Separation of storage layer through IStorage interface allows seamless swapping

**API Endpoints:**
- `GET /api/messages` - Retrieve all saved messages
- `GET /api/messages/:id` - Retrieve specific message
- `POST /api/messages` - Create new saved message
- `PATCH /api/messages/:id` - Update existing saved message
- `DELETE /api/messages/:id` - Delete saved message

**Server Architecture:**
- Middleware-based request/response handling
- Development mode integrates Vite middleware for HMR
- Production mode serves static assets from build directory
- Request logging middleware for API calls

### Core Encoding Algorithm

**Spectrum Mapping:**
- Fixed mapping of 26 letters (A-Z) to hex color codes representing visible spectrum
- Special colors for Start of Frame (SOF: cyan #00FFFF) and End of Frame (EOF: magenta #FF00FF)
- Preamble sequence with white (#FFFFFF) and black (#000000) for synchronization

**Signal Structure:**
1. Preamble white (300ms) - synchronization marker
2. Preamble black (300ms) - synchronization marker  
3. Start of Frame marker
4. Letter sequence (each letter separated by guard intervals)
5. End of Frame marker

**Timing Parameters:**
- TS (Symbol Duration): 50-500ms, default 140ms - duration each color is displayed
- TG (Guard Time): 10-200ms, default 30ms - black interval between symbols to prevent color bleeding
- Configurable via UI sliders with real-time preview

**Animation System:**
- RequestAnimationFrame-based animation loop for smooth playback
- Playback speed control (0.5x, 1x, 2x, 4x)
- Progress tracking with visual timeline
- Play/pause/reset controls

### Data Models

**TypeScript Schemas (Zod validation):**
```typescript
EncodingParams {
  tsMs: number (50-500)
  tgMs: number (10-200)
}

ColorSignalElement {
  color: string (hex code)
  letter?: string (optional)
  duration: number (milliseconds)
  type: 'preamble-white' | 'preamble-black' | 'sof' | 'eof' | 'letter' | 'guard'
}

SavedMessage {
  id: string (UUID)
  message: string
  tsMs: number
  tgMs: number
}
```

**Database Schema:**
- `saved_messages` table with PostgreSQL schema defined using Drizzle ORM
- Currently unused but configured for future persistence requirements
- UUID primary keys for saved messages

### Styling System

**Theme Architecture:**
- CSS custom properties (variables) for colors
- HSL color space for better manipulation
- Dual theme support (light/dark) with dark as default
- Alpha channel support for transparency
- Neutral base color palette (configurable in tailwind.config.ts)

**Design Tokens:**
- Spacing scale: 2, 4, 6, 8 (Tailwind units)
- Border radius: sm (3px), md (6px), lg (9px)
- Typography: Inter for UI, JetBrains Mono for code/technical content
- Responsive breakpoints: mobile-first with md: (768px) and lg: breakpoints

**Component Styling Patterns:**
- `hover-elevate` and `active-elevate` custom utilities for interactive feedback
- Card-based layouts with consistent borders and shadows
- Timeline visualization using flex layouts with proportional widths

## External Dependencies

### Core Framework & Build Tools
- **React 18** - UI framework
- **Vite** - Build tool and dev server with HMR
- **TypeScript** - Type safety across codebase
- **Express.js** - HTTP server and API routing

### UI Component Libraries
- **Radix UI** - Accessible component primitives (20+ components: accordion, dialog, dropdown, tooltip, etc.)
- **shadcn/ui** - Pre-styled component library built on Radix
- **Lucide React** - Icon library

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **class-variance-authority** - Type-safe variant handling
- **tailwind-merge** & **clsx** - Class name utilities

### State & Data Management
- **TanStack Query v5** - Server state management with caching
- **React Hook Form** - Form handling (configured but minimal usage)
- **Zod** - Runtime type validation and schema definitions
- **Drizzle ORM** - Database toolkit for PostgreSQL

### Database
- **PostgreSQL** via @neondatabase/serverless - Serverless Postgres driver
- **Drizzle Kit** - Database migration tool
- **connect-pg-simple** - PostgreSQL session store

### Routing & Navigation
- **Wouter** - Lightweight client-side routing

### Developer Experience
- **@replit/vite-plugin** suite - Replit-specific development tools (error overlay, cartographer, dev banner)

### Utilities
- **date-fns** - Date manipulation
- **nanoid** - Unique ID generation
- **embla-carousel-react** - Carousel component (available but unused)

### Production Dependencies Note
All dependencies are in the production bundle. The application uses in-memory storage by default but can be configured to use PostgreSQL by setting the `DATABASE_URL` environment variable and running migrations with `npm run db:push`.