# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Untypical Mafia** is a social deduction game based on One Night Ultimate Werewolf (ONUW) with a cyclical structure. It's a real-time multiplayer web application built with Nuxt 4, Vue 3, and Socket.IO.

## Architecture

### Technology Stack
- **Frontend**: Nuxt 4 + Vue 3 (SPA mode with `srcDir: app`)
- **Backend**: Node.js + Express + Socket.IO
- **Real-time**: WebSocket-based event-driven architecture
- **State Management**: Vue Composition API with reactive state

### Key Architectural Patterns

**Event-Driven Communication**: The game uses Socket.IO events for all client-server communication. Critical events:
- `create-room`, `join-room`, `start-game` 
- `send-message`, `select-role`, `vote-player`
- `admin-action`, `voice-activity`

**Centralized Role System**: All roles are defined in `shared/rolesRegistry.js` as the single source of truth, with server importing via `server/utils/gameHelpers.js` re-exports.

**Composable-Based State**: Client state is managed through `app/composables/useGame.js` and `useSocket.js` composables using Vue's reactive system.

## Development Commands

```bash
# Development (runs both server and client)
npm run dev

# Server only (port 3001)
npm run dev:server

# Client only (port 3000)  
npm run dev:client

# Production build
npm run build

# Production start
npm run start

# Linting
npm run lint

# Testing
npm run test
npm run test:unit
```

## Game Flow Architecture

### Phase System
1. **setup** - Role selection by host
2. **introduction** - 3-minute player introductions  
3. **night** - Automated role actions (order-based)
4. **day** - 5-minute discussion
5. **voting** - Player elimination
6. **ended** - Victory conditions checked

### Critical Game Components

**GameRoom (`server/models/GameRoom.js`)**: Core game state container managing players, roles, chat, and game phases.

**Socket Server (`server/socket-server.js`)**: Main event handler with ChatCommandProcessor integration for whisper commands (`/w player message`, `/help`).

**Role System (`server/roles/`)**: Class-based role implementations inheriting from `BaseRole`, with automated night action execution based on `nightOrder`.

## Chat System Integration

The chat system uses `SimpleChatProcessor` (imported as `chatProcessor`) that processes commands before regular messages:

- Commands are detected with `isCommand()` and processed with `processCommand()`
- Regular messages go through chat permissions based on game phase
- Whisper commands: `/w [player] [message]` for private messages

## Client Architecture

### Key Composables
- `useGame.js` - Central game state and actions
- `useSocket.js` - Socket.IO client wrapper
- `useVoiceActivity.js` - WebRTC voice activity detection
- `useSound.js` - Game sound effects

### Component Structure
- Phase components: `GameSetup.vue`, `NightPhase.vue`, `DayPhase.vue`, `VotingPhase.vue`
- `GameChat.vue` - Chat interface with command support
- `PlayersList.vue` - Player management and display

## Role Development

Roles are defined in `shared/rolesRegistry.js` with this structure:
```javascript
{
  id: 'role_id',
  name: 'Display Name',
  description: 'Role ability description',
  team: 'village|werewolf|tanner|special',
  hasNightAction: boolean,
  nightOrder: number, // execution order (1-20)
  implemented: boolean,
  phaseHints: { night: 'hint', day: 'hint' }
}
```

## Development Notes

### File Structure Constraints
- Client code must be in `app/` directory (Nuxt srcDir)
- Server code in `server/` with specific structure for roles, models, utils
- Shared code in `shared/` for cross-platform modules
- Static assets in `public/` (sounds, role images, icons)

### Critical Integration Points
- Socket events must be handled in both client composables and server socket-server.js
- Role balance validation happens in both GameSetup component and server room creation
- Chat permissions vary by game phase and must be enforced server-side

### Production Configuration
- Socket server runs on port 3001
- Nuxt client serves on port 3000  
- CORS configured for `localhost:3000` (dev) and `mafia.waifucards.app` (prod)
- Environment: `NODE_ENV=production SOCKET_PORT=3001`

## Security & Performance

- Rate limiting: 20 messages/minute per socket
- Input sanitization for all user data
- WebSocket throttling for voice activity (150ms)
- Automatic room cleanup (30 minutes inactive)
- Memory management with player disconnection handling

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.