# Visual Signal Encoder/Decoder

## Overview

A web-based application designed for visual communication, encoding text into animated color sequences and decoding them back. It features a unique mapping of letters to visible spectrum colors, real-time encoding/decoding, adjustable timing, and an interactive timeline visualization. The system supports dual-channel encoding (color and brightness-encoded wavelength) with a calibration sequence for robust cross-device communication, overcoming environmental challenges. A core ambition is to provide reliable visual data transmission.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:** React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS (Material Design 3-inspired), Radix UI, shadcn/ui.

**Design Rationale:** Focus on type safety, fast development, accessibility, and modular component architecture. Tailwind CSS for rapid UI development, Radix UI for accessible primitives.

**Component Structure:** Modular with separation between UI primitives and application-specific components. Custom components for encoding/decoding, visualization, and parameter controls. Includes a shadcn sidebar for a saved messages library.

**State Management:** Local React state for UI interactions; TanStack Query for server state (saved messages) with authentication state management.

### Backend Architecture

**Technology Stack:** Express.js, TypeScript, PostgreSQL (with graceful fallback to in-memory MemStorage), Drizzle ORM.

**Design Rationale:** Lightweight HTTP server, smart storage layer (PostgreSQL or in-memory), RESTful API for message CRUD operations. Lazy database initialization prevents crashes if a database isn't configured. Authentication via mobile number and session management.

**API Endpoints:**
- `GET /api/messages` - Saved encoded messages library
- `GET /api/messages/:id`
- `POST /api/messages`
- `PATCH /api/messages/:id`
- `DELETE /api/messages/:id`
- `POST /api/auth/register` - Register with country code and mobile number
- `POST /api/auth/send-verification` - Send 5-digit SMS verification code
- `POST /api/auth/verify-code` - Verify SMS code and activate account
- `POST /api/auth/update-location` - Update user location after permission grant
- `POST /api/auth/login` - Mobile number authentication (deprecated - now uses verification flow)
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/messaging/send` - Send message to another user
- `GET /api/messaging/inbox` - Receive messages
- `GET /api/messaging/sent` - View sent messages
- `PATCH /api/messaging/:id/read` - Mark message as read
- `GET /api/messaging/unread-count` - Get unread message count

### Core Encoding Algorithm

**Spectrum Mapping:** Fixed mapping of A-Z to hex color codes from the visible spectrum. Special colors for SOF (cyan), EOF (magenta). Preamble uses white and black for synchronization.

**Signal Structure:** Preamble (white, black), SOF marker, letter sequence (each letter separated by guard intervals), EOF marker. Each letter also includes 3 brightness digit pulses for wavelength embedding, with an optional calibration sequence.

**Timing Parameters:** Configurable Symbol Duration (TS: 50-500ms) and Guard Time (TG: 10-200ms).

**Animation System:** RequestAnimationFrame-based loop with playback speed control, progress tracking, and standard controls (play/pause/reset).

### Decoding System (Camera Scanner)

**Color Detection:** Perceptual LAB color space matching with Delta E distance calculation. Precomputed LAB values for A-Z. SOF/EOF/guard/preamble detection using RGB thresholds. Samples a 30x30px center area from the video feed.

**Dual-Channel Decoding:**
1.  **Color Channel:** LAB matching for letter detection.
2.  **Numeric Channel:** Brightness pulse detection and wavelength reconstruction.
3.  **Verification:** Both channels must agree for a letter to be added.
Supports an optional calibration sequence with reference wavelengths for adaptive detection. Includes a fallback to color-only legacy mode if no calibration is detected.

**Scanner Component:** WebRTC camera access, real-time frame processing at 60fps, state machine for signal detection, guard state flag system, letter confirmation (2+ consecutive frames), and live UI feedback.

### In-App Messaging System

**Purpose:** Allows authenticated users to send and receive text messages to each other using mobile numbers, with real-time notification alerts. Messages are encoded using wavelength format before transmission and decoded for display.

**Database Schema:** `user_messages` table with senderId (FK to users), recipientMobileNumber, messageContent (stores wavelength format), status (pending/read), createdAt.

**Wavelength Encoding Integration:**
- **Encoding on Send**: Text messages are converted to wavelength numbers before storage
- **Character Support**: Letters (A-Z: 380-740nm), Numbers (0-9: 750-795nm), Punctuation (800-895nm)
- **Word Preservation**: Tab separators maintain word boundaries in encoded format
- **Decoding on Display**: Wavelength format automatically decoded to readable text
- **Dual Display**: UI shows both raw wavelength format and decoded text
- **Example**: "HELLO WORLD" → "485 470 625 625 590[TAB]700 590 610 625 440"
- **Performance**: Cached reverse lookup map for efficient decoding

**Features:**
- Send messages to any mobile number (numeric validation: digits only, optional + prefix)
- Inbox view with sender mobile numbers (joined from users table)
- Sent messages view
- Mark messages as read functionality with authorization checks
- Unread message count badge in header navigation
- Polling-based real-time updates (15s for inbox/unread, 30s for sent messages)
- Pagination support (limit 50 per page with hasMore indicator)
- Extended character support (letters, numbers, common punctuation)

**Security:** 
- All messaging endpoints require authentication via session
- Mark-as-read verifies recipient authorization through storage-layer recipientMobileNumber matching
- Mobile number validation on both client and server (regex: /^\+?[0-9]+$/)

**UI Components:**
- Messages page (/messages) with Inbox/Sent tabs
- Compose form with recipient mobile input and message textarea
- Message cards showing:
  - Status (pending/read), sender/recipient, timestamp
  - Wavelength Format display (monospace font, gray background)
  - Decoded Message display (readable text)
- Real-time unread count badge on Messages navigation link

### Styling System

**Theme Architecture:** CSS custom properties for colors (HSL), dual light/dark theme (dark default), neutral base palette.

**Design Tokens:** Consistent spacing, border radius, typography (Inter, JetBrains Mono), responsive breakpoints (mobile-first).

## External Dependencies

-   **UI Framework & Build:** React 18, Vite, TypeScript, Express.js
-   **UI Components:** Radix UI, shadcn/ui, Lucide React (icons)
-   **Styling:** Tailwind CSS, class-variance-authority, tailwind-merge, clsx
-   **State & Data Management:** TanStack Query v5, React Hook Form, Zod, Drizzle ORM
-   **Database:** PostgreSQL (via @neondatabase/serverless), Drizzle Kit, connect-pg-simple
-   **Routing:** Wouter
-   **Authentication:** express-session, Twilio Programmable Messaging (for SMS verification)
-   **Utilities:** date-fns, nanoid

## Recent Changes (November 2025)

### SMS Verification & Location-Based Signup

**Implementation:** Country-based mobile signup with Twilio SMS verification and browser geolocation.

**Features:**
- **Country Selection**: 50+ international dialing codes from dropdown
- **SMS Verification**: Twilio Programmable Messaging API sends custom 5-digit codes
- **Location Verification**: HTML5 Geolocation API with permission handling
- **Dev Mode Fallback**: Returns verification codes in response when Twilio unavailable

**API Secrets Required:**
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `TWILIO_PHONE_NUMBER`: Twilio phone number to send SMS from (or TWILIO_VERIFY_SERVICE_SID as fallback)

**Database Schema Changes:**
- Added `countryCode` (varchar), `isVerified`, `verificationCode`, `verificationCodeExpiry`, `latitude`, `longitude` to users table
- Verification codes expire after 10 minutes

**Note on Twilio Integration:** Using Programmable Messaging API (not Verify API) to support custom 5-digit codes. Verify Service SID can be used as fallback phone number if TWILIO_PHONE_NUMBER not set.