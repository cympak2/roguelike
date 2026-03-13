# Roguelike Game - Copilot Instructions

## Project Overview
Traditional roguelike dungeon crawler: **Phaser 3.90.0** + **TypeScript** + **Vite 7.3.1**. Features procedural BSP dungeons, turn-based combat, monster AI, inventory, NPC dialogue. ASCII rendering on 80x40 grid (960x480px canvas). **Node 25.3.0, npm 11.7.0** (works with Node 18+).

## Build & Development Commands

### Core Workflow
1. **Install**: `npm install` (~786ms, always run after cloning or package.json changes)
2. **Dev server**: `npm run dev` (http://localhost:5173, may use 5174-5175 if busy - CHECK TERMINAL)
3. **Build**: `npm run build` (~3-4s, outputs to `dist/`, ~1.3MB - WARNING about chunk size is NORMAL)
4. **Preview**: `npm run preview` (serves production build)
5. **Type check**: `npx tsc --noEmit` (~2-3s, WILL show errors in `*.test.ts` files - ignore these)

### Testing & Linting
- **No test runner configured**: Test files exist (`src/systems/*.test.ts`, `test-*.mjs`) but Jest/Mocha NOT installed
- **No linting**: No ESLint/Prettier configured

## Architecture & File Structure

**Entry**: `index.html` → `/src/main.ts` (initializes Phaser, registers scenes)

### Key Directories
- **`src/config/`**: Game data - `gameConfig.ts` (Phaser config, **960x480 canvas**), `class-data.ts`, `monster-data.ts` (10 types), `item-data.ts` (24 items), `npc-data.ts`
- **`src/scenes/`**: Phaser scenes - `BootScene` → `MainMenuScene` → `GameScene` (main loop) + `InventoryScene`, `DialogueScene`, `GameOverScene`
- **`src/entities/`**: `Entity.ts` (base), `player.ts`, `monster.ts`, `npc.ts`
- **`src/systems/`**: Game logic - `turn-system`, `combat-system`, `movement-system`, `monster-ai-system`, `monster-spawn-system`, `item-spawn-system`, `equipment-system`, `xp-system`, `floor-transition-system`
- **`src/world/`**: Map gen - `map.ts`, `town-gen.ts`, `dungeon-gen.ts` (BSP), `fov.ts` (shadowcasting), `pathfinding.ts` (A*)
- **`src/ui/`**: `ascii-renderer.ts` (80x40 grid), `hud.ts`, `message-log.ts`
- **`src/utils/`**: `math.ts`
- **`docs/`**: All documentation files (93 .md files - guides, summaries, references)
- **`tests/`**: All test files (13 files - `test-*.mjs`, `test-*.js`, HTML test pages)

### Import Conventions
- **Use relative paths**: `import { X } from '../systems/Y'` (NO `@/` aliases despite vite.config)
- **Phaser**: `import Phaser from 'phaser'` (default import)
- **Avoid circular deps**: Don't import scenes into systems

### Configuration
- **tsconfig.json**: ES2020, strict mode, `noEmit: true`, bundler resolution
- **vite.config.ts**: Port 5173 (strictPort: false), ES2020, sourcemaps enabled
- **gameConfig.ts**: **CRITICAL - Canvas: 960x480px** (80×40 grid × 12px tiles), Phaser.CANVAS, pixelArt: true

## Validation & Common Issues

### Pre-Check-In (No CI/CD configured)
1. `npx tsc --noEmit` - expect errors ONLY in `*.test.ts` files (normal)
2. `npm run build` - expect chunk size warning (normal, Phaser is large)
3. Test in browser at http://localhost:5173

### Common Problems & Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| TypeScript errors in `*.test.ts` | No test framework installed | Ignore - only fix errors in `src/` |
| "Port 5173 in use" | Old dev server running | Check terminal for actual port (5174/5175) |
| Changes not showing | Browser cache | Hard refresh: Ctrl+Shift+R (Win/Linux) or Cmd+Shift+R (Mac) |
| Canvas cut off | Modified canvas size | Restore width: 960, height: 480 in gameConfig.ts |
| Module import errors | Wrong path/circular dep | Use relative paths, don't import scenes into systems |

## Development Patterns

### File Organization
**CRITICAL**: Keep the repository root clean. Follow these conventions strictly:
- **Documentation**: ALL .md files go in `docs/` folder (guides, summaries, references, status docs)
- **Test files**: ALL test files go in `tests/` folder (`test-*.mjs`, `test-*.js`, `*.test.ts`, test HTML files)
- **Source code**: ALL TypeScript/JavaScript source goes in `src/` folder
- **Config files**: Only essential config files in root (package.json, tsconfig.json, vite.config.ts, index.html)
- **Exception**: `.github/copilot-instructions.md` stays in `.github/` (repository onboarding)

### Code Style
- **Classes**: TypeScript classes extending base types (`Phaser.Scene`, `Entity`)
- **Systems**: Stateful classes instantiated in GameScene
- **Enums**: Use TypeScript enums (`TileType`, `MessageType`)

### Adding Features
- **New system**: Add to `src/systems/`, import in `GameScene.ts`
- **New entity**: Extend `Entity` in `src/entities/`
- **New scene**: Create in `src/scenes/`, add to `src/main.ts` scenes array
- **New UI**: Add to `src/ui/`, integrate with renderer
- **New documentation**: Add to `docs/` folder (NOT root)
- **New test**: Add to `tests/` folder (NOT root)

## Critical Facts for Agents

### Always Trust
1. **Canvas is 960×480** - changing breaks rendering
2. **Port varies (5173-5175)** - check terminal, not hardcoded
3. **Test file errors expected** - ignore `*.test.ts` errors
4. **Build chunk warning normal** - Phaser is large (~1.3MB)
5. **No `@/` imports** - use relative paths despite vite alias
6. **Strict TypeScript** - all code must pass type check

### Common Pitfalls
❌ Don't change canvas dimensions  
❌ Don't run tests without installing Jest/Mocha  
❌ Don't use `@/` alias  
❌ Don't add code to `dist/`  
❌ Don't import scenes into systems  
❌ Don't create .md files in root (use `docs/`)  
❌ Don't create test files in root (use `tests/`)  
✅ Run `npm install` after package.json changes  
✅ Check browser console for errors  
✅ Use relative imports  
✅ Verify with `npx tsc --noEmit`  
✅ Put all documentation in `docs/`  
✅ Put all test files in `tests/`

