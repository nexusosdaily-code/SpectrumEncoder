# NEXUS Visual Signal Encoder/Decoder

> A revolutionary open-source platform for visual communication using wavelength-based color spectrum encoding with social networking capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)

## Overview

NEXUS is a web-based application designed for visual communication, encoding text into animated color sequences and decoding them back using your device's camera. It features a unique mapping of characters to visible spectrum wavelengths, real-time encoding/decoding, and a social platform for sharing visual messages.

### Key Features

- **Visual Encoding**: Convert text to animated color sequences using wavelength mapping
  - Letters (A-Z): 380-740nm visible spectrum
  - Numbers (0-9): 750-795nm
  - Punctuation: 800-895nm
- **Camera-Based Decoding**: Real-time scanning and decoding of visual signals
- **Dual-Channel System**: Color and brightness-encoded wavelength verification
- **Social Platform**: User profiles, follow system, and message sharing
- **SMS Authentication**: Secure country-based mobile verification with Twilio
- **In-App Messaging**: Send wavelength-encoded messages to other users
- **Responsive Design**: Modern UI with dark mode support

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Wouter for routing
- TanStack Query v5 for state management
- Tailwind CSS with Radix UI and shadcn/ui components
- Lucide React icons

### Backend
- Express.js with TypeScript
- PostgreSQL database (with in-memory fallback)
- Drizzle ORM
- Express sessions for authentication
- Twilio Programmable Messaging for SMS verification

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (optional - falls back to in-memory storage)
- Twilio account for SMS verification (optional - has dev mode fallback)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/nexus-visual-signal.git
cd nexus-visual-signal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Required for production
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret

# Optional - for SMS verification
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

4. Initialize the database (if using PostgreSQL):
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
nexus-visual-signal/
├── client/               # Frontend React application
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Page components
│       ├── lib/          # Utility functions
│       └── hooks/        # Custom React hooks
├── server/               # Backend Express application
│   ├── routes.ts         # API route definitions
│   └── storage.ts        # Database abstraction layer
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle database schema
└── README.md
```

## Features in Detail

### Visual Signal Encoding

Text is converted into animated color sequences using a wavelength-based mapping system:

1. **Preamble**: White/black synchronization pulses
2. **Start-of-Frame (SOF)**: Cyan marker
3. **Letter Sequence**: Each character mapped to its wavelength color
4. **Guard Intervals**: Black separators between characters
5. **End-of-Frame (EOF)**: Magenta marker

Each letter also includes 3 brightness digit pulses for dual-channel verification.

### Decoding System

The camera scanner uses:
- **Color Detection**: Perceptual LAB color space matching with Delta E distance
- **Brightness Analysis**: Wavelength reconstruction from intensity pulses
- **Dual Verification**: Both channels must agree for accurate decoding
- **Calibration Sequence**: Optional adaptive detection for environmental challenges

### Social Features

- **User Profiles**: Display name, bio, avatar, online status
- **Follow System**: Follow users and view follower/following lists
- **User Discovery**: Search users by name or mobile number
- **In-App Messaging**: Send wavelength-encoded messages
- **Real-Time Updates**: Polling-based message notifications

## Authentication

The app uses mobile number authentication with SMS verification:

1. Select your country code
2. Enter your mobile number
3. Receive a 5-digit verification code via SMS
4. Verify the code to activate your account
5. Optionally share location for future features

## Contributing

We welcome contributions from the community! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide to get started.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push database schema changes
npm run db:studio    # Open Drizzle Studio (database GUI)
```

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts with profile information
- `user_messages` - In-app wavelength-encoded messages
- `userFollowers` - Follow relationships
- `networkNodes` - Distributed security nodes (planned feature)

## Security

- Session-based authentication
- SMS verification via Twilio
- Server-side validation on all mutations
- Protected API endpoints requiring authentication
- No client-side secret exposure

## Roadmap

- [ ] Distributed peer-to-peer network security
- [ ] WebRTC real-time visual communication
- [ ] Mobile apps (iOS/Android)
- [ ] Enhanced calibration for outdoor use
- [ ] Group messaging and channels
- [ ] End-to-end encryption

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on Replit with modern web technologies
- Color science inspired by wavelength-to-RGB mapping
- Community-driven open source project

## Support

- Issues: [GitHub Issues](https://github.com/your-username/nexus-visual-signal/issues)
- Discussions: [GitHub Discussions](https://github.com/your-username/nexus-visual-signal/discussions)

---

Made with ❤️ by the NEXUS community
