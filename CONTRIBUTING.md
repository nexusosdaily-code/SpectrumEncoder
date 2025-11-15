# Contributing to NEXUS Visual Signal

Thank you for your interest in contributing to NEXUS! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected vs actual behavior
4. Screenshots or error messages if applicable
5. Your environment (browser, OS, device)

### Suggesting Features

We welcome feature suggestions! Please create an issue with:

1. A clear description of the feature
2. The problem it solves
3. Possible implementation approach
4. Any relevant examples or mockups

### Submitting Code

#### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/nexus-visual-signal.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Set up your environment variables (see README.md)

#### Development Workflow

1. Make your changes in your feature branch
2. Follow the existing code style and conventions
3. Add tests if applicable
4. Test your changes thoroughly
5. Commit with clear, descriptive messages
6. Push to your fork
7. Open a Pull Request

#### Code Style

- Use TypeScript for all new code
- Follow the existing code formatting (Prettier/ESLint)
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

#### TypeScript Guidelines

- Use strict type checking
- Avoid `any` types when possible
- Define interfaces for component props
- Use Zod schemas for API validation

#### React Guidelines

- Use functional components with hooks
- Follow the component structure in `client/src/components`
- Use shadcn/ui components when available
- Add `data-testid` attributes for testable elements
- Keep components focused on a single responsibility

#### Backend Guidelines

- Keep routes thin - logic belongs in storage layer
- Validate all inputs with Zod schemas
- Use proper HTTP status codes
- Always check authentication for protected routes
- Handle errors gracefully

#### Database Changes

- Update `shared/schema.ts` for schema changes
- Update storage interface in `server/storage.ts`
- Run `npm run db:push` to sync schema
- Never manually write SQL migrations

#### Commit Messages

Follow the conventional commits format:

- `feat: add user profile export feature`
- `fix: resolve camera permission issue on iOS`
- `docs: update setup instructions`
- `style: format code with prettier`
- `refactor: simplify color detection logic`
- `test: add tests for wavelength encoding`
- `chore: update dependencies`

### Pull Request Process

1. Update the README.md with details of changes if needed
2. Ensure all tests pass
3. Test your changes in both light and dark mode
4. Test on mobile if UI changes are involved
5. Update documentation for new features
6. Request review from maintainers

#### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Tested in multiple browsers (Chrome, Firefox, Safari)
- [ ] Mobile responsive (if UI changes)
- [ ] Dark mode works correctly (if UI changes)

## Project Areas

### High Priority Areas

- **Performance**: Optimize encoding/decoding speed
- **Accuracy**: Improve color detection in various lighting
- **Mobile**: Enhance mobile camera support
- **Accessibility**: Improve keyboard navigation and screen reader support

### Feature Areas

- **Encoding System**: Wavelength mapping, timing optimization
- **Decoding System**: Camera detection, calibration improvements
- **Social Features**: Profiles, messaging, discovery
- **Authentication**: SMS verification, session management
- **UI/UX**: Design improvements, animations, responsiveness

## Development Tips

### Local Development

```bash
npm run dev          # Start development server
npm run db:push      # Sync database schema
npm run db:studio    # Open database GUI
```

### Environment Variables

Create a `.env` file (never commit this):

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=your-number
```

### Testing Camera Features

- Use a second device to display encoded signals
- Test in different lighting conditions
- Verify both color and brightness channels work
- Check calibration sequence functionality

### Database Development

- Use in-memory storage for quick testing (no DATABASE_URL)
- Use PostgreSQL for production-like testing
- Run `npm run db:studio` to inspect database

## Architecture Overview

### Frontend
- React components in `client/src/components`
- Pages in `client/src/pages`
- Routing with Wouter
- State management with TanStack Query

### Backend
- Express routes in `server/routes.ts`
- Storage abstraction in `server/storage.ts`
- Shared types in `shared/schema.ts`

### Database
- Drizzle ORM for type-safe queries
- PostgreSQL with in-memory fallback
- Schema-first development

## Questions?

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to NEXUS! 🌈
