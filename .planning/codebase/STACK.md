# Technology Stack

**Analysis Date:** 2026-02-11

## Languages

**Primary:**
- TypeScript 5.9.2 - All source code
- JavaScript ES2022 - Config files and build tooling

**Secondary:**
- SCSS - Component styling

## Runtime

**Environment:**
- Node.js (LTS) - Specified via `.nvmrc`
- Browser (client-side) - Target: ES2022, DOM APIs

**Package Manager:**
- Yarn 1.22.22
- Lockfile: `yarn.lock` present

## Frameworks

**Core:**
- React ~18.2.0 - UI framework (peer dependency)
- React DOM ~18.2.0 - DOM rendering (peer dependency)
- MobX ~6.15.0 - State management/reactivity
- MobX React Lite ~4.1.0 - MobX-React integration

**Testing:**
- None detected in hoist-react itself (framework library)

**Build/Dev:**
- TypeScript ~5.9.2 - Type system and compilation
- Webpack - Build tooling (via `webpack.config.intellij.js` and app-level usage)
- ESLint 9.x - Code linting
- Prettier 3.x - Code formatting
- Stylelint 16.x - SCSS linting
- Husky 9.x - Git hooks
- Lint-staged 16.x - Pre-commit checks

## Key Dependencies

**Critical:**
- `@blueprintjs/core` ^6.3.2 - Desktop UI component library
- `@blueprintjs/datetime` ^6.0.6 - Date/time pickers
- `ag-grid-community` 34.x (devDep/peerDep) - Enterprise grid component
- `ag-grid-react` 34.x (devDep/peerDep) - ag-Grid React wrapper
- `lodash` ~4.17.21 - Utility functions
- `moment` ~2.30.1 - Date manipulation
- `router5` ~7.0.2 - Client-side routing
- `jquery` 3.x - Legacy compatibility
- `core-js` 3.x - Polyfills

**UI Components:**
- `@fortawesome/fontawesome-pro` ^6.6.0 - Icon library (Pro license required)
- `golden-layout` ~1.5.9 - Desktop panel layout
- `react-grid-layout` 2.1.1 - Grid layout system
- `react-beautiful-dnd` ~13.1.0 - Drag and drop
- `react-select` ~4.3.1 - Select inputs
- `react-dates` ~21.8.0 - Date range pickers
- `react-markdown` ~10.1.0 - Markdown rendering
- `codemirror` ~5.65.0 - Code editor
- `swiper` ^11.2.0 - Carousel/slider
- `onsenui` ~2.12.8 / `react-onsenui` ~1.13.2 - Mobile UI components

**Auth:**
- `@auth0/auth0-spa-js` ~2.9.1 - Auth0 OAuth client
- `@azure/msal-browser` ~4.26.2 - Azure/Microsoft OAuth client
- `jwt-decode` ~4.0.0 - JWT token parsing

**Infrastructure:**
- `qs` ~6.14.0 - Query string parsing
- `numbro` ~2.5.0 - Number formatting
- `filesize` ~11.0.2 - File size formatting
- `classnames` ~2.5.1 - CSS class composition
- `dompurify` ~3.3.0 - HTML sanitization
- `short-unique-id` ~5.3.2 - ID generation
- `store2` ~2.14.3 - LocalStorage wrapper
- `ua-parser-js` ~2.0.4 - User agent parsing

## Configuration

**Environment:**
- No `.env` files in framework (apps provide their own)
- Runtime config managed via `ConfigService`
- Auth providers configured programmatically

**Build:**
- `tsconfig.json` - TypeScript compiler config (ES2022, composite build)
- `eslint.config.js` - ESLint (extends `@xh/eslint-config`)
- Prettier/Stylelint config via lint-staged in `package.json`
- Path alias: `@xh/hoist/*` maps to root

## Platform Requirements

**Development:**
- Node.js LTS (per `.nvmrc`)
- Yarn 1.22.22
- TypeScript 5.9.2
- Applications must provide ag-Grid (community or enterprise) 34.x
- Applications must provide FontAwesome Pro license

**Production:**
- Modern browsers with ES2022 support
- Hoist Core server (Grails/Groovy backend) for full-stack apps
- Apps bundle hoist-react as library dependency

---

*Stack analysis: 2026-02-11*
