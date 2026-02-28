/**
 * Document registry for the Hoist MCP server.
 *
 * Provides a hardcoded inventory of all hoist-react documentation, with
 * metadata, file loading, and keyword-based search. This is the single
 * source of truth consumed by both MCP resources and tools.
 *
 * The registry is hardcoded (not filesystem-scanned) because the documentation
 * structure is well-known and stable. Metadata is derived from the docs/README.md
 * index tables.
 */
import {existsSync, readFileSync} from 'node:fs';

import {log} from '../util/logger.js';
import {resolveDocPath} from '../util/paths.js';

//------------------------------------------------------------------
// Types
//------------------------------------------------------------------

/** Category for filtering documents. */
export type DocCategory = 'package' | 'concept' | 'devops' | 'conventions' | 'index';

/** A single document in the registry. */
export interface DocEntry {
    /** Unique identifier, e.g. 'core', 'cmp/grid', 'lifecycle-app', 'conventions'. */
    id: string;
    /** Display title, e.g. 'Core Framework', 'Grid Component'. */
    title: string;
    /** Absolute file path on disk. */
    filePath: string;
    /** Category for filtering. */
    category: DocCategory;
    /** Package name if category is 'package', e.g. 'core', 'cmp/grid'. */
    packageName?: string;
    /** Short description from the docs index. */
    description: string;
    /** Key topics/keywords for search matching. */
    keywords: string[];
}

/** A search result with match context. */
export interface SearchResult {
    entry: DocEntry;
    /** Lines containing matches, with 1-based line numbers. */
    snippets: Array<{lineNumber: number; text: string}>;
    /** Total keyword match count (metadata + content). */
    matchCount: number;
}

/** Options for the search function. */
export interface SearchOptions {
    category?: DocCategory | 'all';
    limit?: number;
}

//------------------------------------------------------------------
// Registry builder
//------------------------------------------------------------------

/** Raw entry definition used to build the registry. */
interface RawEntry {
    id: string;
    title: string;
    file: string;
    category: DocCategory;
    packageName?: string;
    description: string;
    keywords: string[];
}

/** Split a comma-separated keyword string into a trimmed array. */
function splitKeywords(csv: string): string[] {
    return csv
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
}

/** All known documentation entries with metadata from docs/README.md. */
function getRawEntries(): RawEntry[] {
    return [
        //--------------------------------------------------------------
        // Index & Conventions
        //--------------------------------------------------------------
        {
            id: 'index',
            title: 'Hoist Documentation Index',
            file: 'docs/README.md',
            category: 'index',
            description:
                'Primary catalog of all hoist-react documentation with descriptions and key topics for fast, targeted retrieval.',
            keywords: splitKeywords(
                'index, catalog, documentation, quick reference, packages, concepts, devops'
            )
        },
        {
            id: 'conventions',
            title: 'Coding Conventions',
            file: 'docs/coding-conventions.md',
            category: 'conventions',
            description:
                'Comprehensive coding conventions for hoist-react: imports, TypeScript style, naming, class structure, component patterns, exports, null handling, async patterns, error handling, logging, equality, and CSS naming.',
            keywords: splitKeywords(
                'conventions, code style, imports, naming, TypeScript, class structure, component patterns, hoistCmp, exports, null, undefined, async, await, error handling, logging, equality, CSS, BEM, section dividers, declare config'
            )
        },

        //--------------------------------------------------------------
        // Package READMEs
        //--------------------------------------------------------------
        {
            id: 'core',
            title: 'Core Framework',
            file: 'core/README.md',
            category: 'package',
            packageName: 'core',
            description:
                "Foundation classes defining Hoist's component, model, and service architecture.",
            keywords: splitKeywords(
                'HoistBase, HoistModel, HoistService, hoistCmp, XH, element factories, decorators, lifecycle'
            )
        },
        {
            id: 'data',
            title: 'Data Layer',
            file: 'data/README.md',
            category: 'package',
            packageName: 'data',
            description: 'Observable data layer with filtering, validation, and aggregation.',
            keywords: splitKeywords(
                'Store, StoreRecord, Field, Filter, Cube, View, tree data, loadData, processRawData'
            )
        },
        {
            id: 'svc',
            title: 'Built-in Services',
            file: 'svc/README.md',
            category: 'package',
            packageName: 'svc',
            description: 'Built-in singleton services for data access and app-wide operations.',
            keywords: splitKeywords(
                'FetchService, ConfigService, PrefService, IdentityService, TrackService, WebSocketService'
            )
        },
        {
            id: 'cmp',
            title: 'Components Overview',
            file: 'cmp/README.md',
            category: 'package',
            packageName: 'cmp',
            description: 'Cross-platform component overview and catalog.',
            keywords: splitKeywords(
                'Component categories, factory pattern, platform-specific vs shared'
            )
        },
        {
            id: 'cmp/grid',
            title: 'Grid Component',
            file: 'cmp/grid/README.md',
            category: 'package',
            packageName: 'cmp/grid',
            description: 'Primary data grid built on ag-Grid.',
            keywords: splitKeywords(
                'GridModel, Column, ColumnGroup, sorting, grouping, filtering, selection, inline editing, export'
            )
        },
        {
            id: 'cmp/form',
            title: 'Form Infrastructure',
            file: 'cmp/form/README.md',
            category: 'package',
            packageName: 'cmp/form',
            description: 'Form infrastructure for data entry with validation.',
            keywords: splitKeywords(
                'FormModel, FieldModel, SubformsFieldModel, validation rules, data binding'
            )
        },
        {
            id: 'cmp/input',
            title: 'Input Components',
            file: 'cmp/input/README.md',
            category: 'package',
            packageName: 'cmp/input',
            description: 'Base classes and interfaces for input components.',
            keywords: splitKeywords(
                'HoistInputModel, change/commit lifecycle, value binding, focus management'
            )
        },
        {
            id: 'cmp/layout',
            title: 'Layout Containers',
            file: 'cmp/layout/README.md',
            category: 'package',
            packageName: 'cmp/layout',
            description: 'Flexbox-based layout containers.',
            keywords: splitKeywords(
                'Box, VBox, HBox, Frame, Viewport, LayoutProps, pixel conversion'
            )
        },
        {
            id: 'cmp/tab',
            title: 'Tabbed Interface',
            file: 'cmp/tab/README.md',
            category: 'package',
            packageName: 'cmp/tab',
            description: 'Tabbed interface system.',
            keywords: splitKeywords(
                'TabContainerModel, routing integration, render modes, refresh strategies'
            )
        },
        {
            id: 'cmp/viewmanager',
            title: 'View Manager',
            file: 'cmp/viewmanager/README.md',
            category: 'package',
            packageName: 'cmp/viewmanager',
            description: 'Save/load named bundles of component state.',
            keywords: splitKeywords(
                'ViewManagerModel, views, sharing, pinning, auto-save, JsonBlob persistence'
            )
        },
        {
            id: 'desktop/cmp/dash',
            title: 'Dashboard System',
            file: 'desktop/cmp/dash/README.md',
            category: 'package',
            packageName: 'desktop/cmp/dash',
            description: 'Configurable dashboard system with draggable, resizable widgets.',
            keywords: splitKeywords(
                'DashContainerModel, DashCanvasModel, DashViewSpec, DashViewModel, widget persistence, ViewManager integration'
            )
        },
        {
            id: 'desktop/cmp/panel',
            title: 'Desktop Panel',
            file: 'desktop/cmp/panel/README.md',
            category: 'package',
            packageName: 'desktop/cmp/panel',
            description: 'Desktop panel container with toolbars, masks, and collapsible behavior.',
            keywords: splitKeywords(
                'Panel, PanelModel, Toolbar, mask, collapse/resize, persistence, modal support'
            )
        },
        {
            id: 'desktop',
            title: 'Desktop Components',
            file: 'desktop/README.md',
            category: 'package',
            packageName: 'desktop',
            description: 'Desktop-specific components.',
            keywords: splitKeywords('desktop, components, desktop-specific')
        },
        {
            id: 'mobile',
            title: 'Mobile Components',
            file: 'mobile/README.md',
            category: 'package',
            packageName: 'mobile',
            description: 'Mobile-specific components built on Onsen UI.',
            keywords: splitKeywords(
                'AppContainer, NavigatorModel, Panel, AppBar, mobile inputs, touch navigation, swipeable tabs'
            )
        },
        {
            id: 'format',
            title: 'Formatting',
            file: 'format/README.md',
            category: 'package',
            packageName: 'format',
            description: 'Number, date, and miscellaneous formatting for grids and display.',
            keywords: splitKeywords(
                'fmtNumber, fmtPercent, fmtMillions, numberRenderer, dateRenderer, ledger, colorSpec, auto-precision'
            )
        },
        {
            id: 'appcontainer',
            title: 'Application Shell',
            file: 'appcontainer/README.md',
            category: 'package',
            packageName: 'appcontainer',
            description:
                'Application shell -- lifecycle, dialogs, toasts, banners, theming, and environment.',
            keywords: splitKeywords(
                'AppContainerModel, MessageSpec, ToastSpec, BannerSpec, ExceptionDialogModel, ThemeModel, RouterModel, AppOption'
            )
        },
        {
            id: 'utils',
            title: 'Utilities',
            file: 'utils/README.md',
            category: 'package',
            packageName: 'utils',
            description:
                'Async, datetime, JS, and React utility functions used throughout hoist-react.',
            keywords: splitKeywords('Timer, LocalDate, forEachAsync, decorators, logging, hooks')
        },
        {
            id: 'promise',
            title: 'Promise Extensions',
            file: 'promise/README.md',
            category: 'package',
            packageName: 'promise',
            description:
                'Promise prototype extensions for error handling, tracking, masking, and timeouts.',
            keywords: splitKeywords(
                'catchDefault, catchWhen, track, linkTo, timeout, thenAction, wait, waitFor, tap'
            )
        },
        {
            id: 'mobx',
            title: 'MobX Integration',
            file: 'mobx/README.md',
            category: 'package',
            packageName: 'mobx',
            description:
                'MobX integration layer -- re-exports, action enforcement, and @bindable decorator.',
            keywords: splitKeywords(
                '@bindable, @bindable.ref, makeObservable, observer, action, observable, computed, enforceActions'
            )
        },
        {
            id: 'public',
            title: 'Public Resources',
            file: 'public/README.md',
            category: 'package',
            packageName: 'public',
            description: 'Public resources.',
            keywords: splitKeywords('public, resources, assets')
        },
        {
            id: 'static',
            title: 'Static Assets',
            file: 'static/README.md',
            category: 'package',
            packageName: 'static',
            description: 'Static assets.',
            keywords: splitKeywords('static, assets, icons')
        },
        {
            id: 'icon',
            title: 'Icon System',
            file: 'icon/README.md',
            category: 'package',
            packageName: 'icon',
            description: 'Factory-based icon system wrapping FontAwesome Pro.',
            keywords: splitKeywords(
                'Icon, IconProps, intent coloring, size variants, asHtml, fileIcon'
            )
        },
        {
            id: 'security',
            title: 'Security & OAuth',
            file: 'security/README.md',
            category: 'package',
            packageName: 'security',
            description: 'OAuth 2.0 client abstraction for Auth0 and Microsoft Entra ID (MSAL).',
            keywords: splitKeywords(
                'BaseOAuthClient, AuthZeroClient, MsalClient, Token, AccessTokenSpec'
            )
        },
        {
            id: 'kit',
            title: 'Kit (Third-Party Wrappers)',
            file: 'kit/README.md',
            category: 'package',
            packageName: 'kit',
            description: 'Centralized wrappers for third-party libraries used by Hoist.',
            keywords: splitKeywords(
                'installAgGrid, installHighcharts, Blueprint, Onsen, GoldenLayout, react-select'
            )
        },
        {
            id: 'inspector',
            title: 'Inspector',
            file: 'inspector/README.md',
            category: 'package',
            packageName: 'inspector',
            description: 'Built-in developer tool for real-time inspection of Hoist instances.',
            keywords: splitKeywords(
                'InspectorPanel, StatsModel, InstancesModel, property watchlist, model leak detection'
            )
        },

        //--------------------------------------------------------------
        // Developer Tools
        //--------------------------------------------------------------
        {
            id: 'mcp',
            title: 'MCP Server',
            file: 'mcp/README.md',
            category: 'package',
            packageName: 'mcp',
            description:
                'Model Context Protocol server providing AI assistants with documentation search, TypeScript type exploration, and code generation prompts.',
            keywords: splitKeywords(
                'MCP, Model Context Protocol, AI assistant, Claude Code, tools, resources, prompts, search, symbols, documentation'
            )
        },

        //--------------------------------------------------------------
        // Concept docs
        //--------------------------------------------------------------
        {
            id: 'lifecycle-app',
            title: 'Lifecycle: App Initialization',
            file: 'docs/lifecycle-app.md',
            category: 'concept',
            description: 'How a Hoist app initializes -- from entry point to RUNNING state.',
            keywords: splitKeywords(
                'XH.renderApp, AppSpec, AppContainerModel, initialization sequence, AppState'
            )
        },
        {
            id: 'lifecycle-models-and-services',
            title: 'Lifecycle: Models & Services',
            file: 'docs/lifecycle-models-and-services.md',
            category: 'concept',
            description: 'Model, service, and load/refresh lifecycles after app startup.',
            keywords: splitKeywords(
                'HoistModel, onLinked, afterLinked, doLoadAsync, destroy, HoistService, initAsync, LoadSupport, LoadSpec, RefreshContextModel'
            )
        },
        {
            id: 'authentication',
            title: 'Authentication',
            file: 'docs/authentication.md',
            category: 'concept',
            description: 'How Hoist apps authenticate users via OAuth or form-based login.',
            keywords: splitKeywords(
                'HoistAuthModel, MsalClient, AuthZeroClient, Token, IdentityService, checkAccess, impersonation'
            )
        },
        {
            id: 'persistence',
            title: 'Persistence',
            file: 'docs/persistence.md',
            category: 'concept',
            description: 'Persisting user UI state to various backing stores.',
            keywords: splitKeywords(
                '@persist, markPersist, PersistenceProvider, localStorage, Preference, ViewManager, GridModel/FormModel/PanelModel persistence'
            )
        },
        {
            id: 'authorization',
            title: 'Authorization',
            file: 'docs/authorization.md',
            category: 'concept',
            description: 'Role-based authorization and config-driven feature gates.',
            keywords: splitKeywords(
                'HoistUser, hasRole, hasGate, checkAccess, HOIST_ADMIN, roles, gates'
            )
        },
        {
            id: 'routing',
            title: 'Routing',
            file: 'docs/routing.md',
            category: 'concept',
            description: 'Client-side routing via RouterModel (Router5 wrapper).',
            keywords: splitKeywords(
                'RouterModel, getRoutes, XH.routerState, XH.navigate, route parameters, TabContainerModel'
            )
        },
        {
            id: 'error-handling',
            title: 'Error Handling',
            file: 'docs/error-handling.md',
            category: 'concept',
            description: 'Centralized exception handling, display, and logging.',
            keywords: splitKeywords(
                'XH.handleException, ExceptionDialog, catchDefault, alertType, toast, requireReload, ErrorBoundary'
            )
        },
        {
            id: 'test-automation',
            title: 'Test Automation',
            file: 'docs/test-automation.md',
            category: 'concept',
            description: 'Test automation support via testId selectors.',
            keywords: splitKeywords(
                'testId, TestSupportProps, data-testid, getTestId, FormField auto-testId'
            )
        },
        {
            id: 'version-compatibility',
            title: 'Version Compatibility',
            file: 'docs/version-compatibility.md',
            category: 'concept',
            description:
                'Reference mapping hoist-react releases to required/recommended hoist-core versions.',
            keywords: splitKeywords(
                'version, compatibility, hoist-core, upgrade, minimum, required, recommended, matrix, pairing'
            )
        },

        //--------------------------------------------------------------
        // DevOps docs
        //--------------------------------------------------------------
        {
            id: 'build-and-publish',
            title: 'Build & Publish',
            file: 'docs/build-and-publish.md',
            category: 'devops',
            description:
                'GitHub Actions workflows for linting, CodeQL analysis, and npm publishing of hoist-react.',
            keywords: splitKeywords(
                'CI, CD, GitHub Actions, lint, CodeQL, npm, publish, snapshot, release'
            )
        },
        {
            id: 'build-app-deployment',
            title: 'App Build & Deploy',
            file: 'docs/build-app-deployment.md',
            category: 'devops',
            description:
                'Building and deploying full-stack Hoist applications (Gradle, Webpack, Docker).',
            keywords: splitKeywords(
                'build, deploy, pipeline, webpack, gradle, Docker, nginx, Tomcat'
            )
        },
        {
            id: 'development-environment',
            title: 'Development Environment',
            file: 'docs/development-environment.md',
            category: 'devops',
            description: 'Local development environment setup for Hoist and app developers.',
            keywords: splitKeywords(
                'development, environment, setup, local, IDE, Node, yarn, IntelliJ'
            )
        },
        {
            id: 'compilation-notes',
            title: 'Compilation Notes',
            file: 'docs/compilation-notes.md',
            category: 'devops',
            description: 'Notes on TypeScript/Babel compilation and build tooling internals.',
            keywords: splitKeywords('compilation, TypeScript, Babel, transpilation, build tooling')
        },
        {
            id: 'changelog-format',
            title: 'Changelog Format',
            file: 'docs/changelog-format.md',
            category: 'devops',
            description: 'CHANGELOG entry format conventions and section headers.',
            keywords: splitKeywords('changelog, format, conventions, release notes, versioning')
        },

        //--------------------------------------------------------------
        // Upgrade Notes
        //--------------------------------------------------------------
        {
            id: 'upgrade-v78',
            title: 'v78 Upgrade Notes',
            file: 'docs/upgrade-notes/v78-upgrade-notes.md',
            category: 'devops',
            description: 'Upgrade guide from v77.x to v78.0.0. Trivial difficulty.',
            keywords: splitKeywords('upgrade, migration, breaking changes, v78, v77')
        },
        {
            id: 'upgrade-v79',
            title: 'v79 Upgrade Notes',
            file: 'docs/upgrade-notes/v79-upgrade-notes.md',
            category: 'devops',
            description: 'Upgrade guide from v78.x to v79.0.0. Medium difficulty.',
            keywords: splitKeywords('upgrade, migration, breaking changes, v79, v78')
        },
        {
            id: 'upgrade-v80',
            title: 'v80 Upgrade Notes',
            file: 'docs/upgrade-notes/v80-upgrade-notes.md',
            category: 'devops',
            description: 'Upgrade guide from v79.x to v80.0.0. Low difficulty.',
            keywords: splitKeywords('upgrade, migration, breaking changes, v80, v79')
        },
        {
            id: 'upgrade-v81',
            title: 'v81 Upgrade Notes',
            file: 'docs/upgrade-notes/v81-upgrade-notes.md',
            category: 'devops',
            description: 'Upgrade guide from v80.x to v81.0.2. Low difficulty.',
            keywords: splitKeywords('upgrade, migration, breaking changes, v81, v80')
        },
        {
            id: 'upgrade-v82',
            title: 'v82 Upgrade Notes',
            file: 'docs/upgrade-notes/v82-upgrade-notes.md',
            category: 'devops',
            description: 'Upgrade guide from v81.x to v82.0.0. Low difficulty.',
            keywords: splitKeywords('upgrade, migration, breaking changes, v82, v81')
        }
    ];
}

/**
 * Build the complete document registry.
 *
 * This is a hardcoded inventory -- not a filesystem scan -- because the
 * documentation structure is well-known and stable. Each entry's file path
 * is validated at build time; missing files are logged and skipped.
 */
export function buildRegistry(repoRoot: string): DocEntry[] {
    const raw = getRawEntries();
    const registry: DocEntry[] = [];

    for (const entry of raw) {
        const filePath = resolveDocPath(repoRoot, entry.file);

        if (!existsSync(filePath)) {
            log.warn(`Skipping doc entry "${entry.id}": file not found at ${filePath}`);
            continue;
        }

        registry.push({
            id: entry.id,
            title: entry.title,
            filePath,
            category: entry.category,
            ...(entry.packageName ? {packageName: entry.packageName} : {}),
            description: entry.description,
            keywords: entry.keywords
        });
    }

    log.info(
        `Document registry built: ${registry.length} entries across ${new Set(registry.map(e => e.category)).size} categories`
    );
    return registry;
}

//------------------------------------------------------------------
// File loading
//------------------------------------------------------------------

/**
 * Read and return the full content of a document.
 *
 * @throws Error if the file does not exist.
 */
export function loadDocContent(entry: DocEntry): string {
    if (!existsSync(entry.filePath)) {
        throw new Error(`Document file not found: "${entry.id}" at ${entry.filePath}`);
    }
    return readFileSync(entry.filePath, 'utf-8');
}

//------------------------------------------------------------------
// Search
//------------------------------------------------------------------

/**
 * Search across all documents by keyword, returning matching entries with
 * context snippets.
 *
 * Uses simple case-insensitive string matching -- appropriate for the small,
 * bounded documentation corpus (~40 files).
 */
export function searchDocs(
    registry: DocEntry[],
    query: string,
    options?: SearchOptions
): SearchResult[] {
    const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(t => t.length > 1);

    if (terms.length === 0) return [];

    const results: SearchResult[] = [];

    for (const entry of registry) {
        // Filter by category if specified.
        if (
            options?.category &&
            options.category !== 'all' &&
            entry.category !== options.category
        ) {
            continue;
        }

        // Check metadata (cheap).
        const metaText =
            `${entry.title} ${entry.description} ${entry.keywords.join(' ')}`.toLowerCase();
        const metaMatches = terms.filter(t => metaText.includes(t)).length;

        // Check file content.
        const content = readFileSync(entry.filePath, 'utf-8');
        const contentLower = content.toLowerCase();
        const contentMatches = terms.filter(t => contentLower.includes(t)).length;

        const totalMatches = metaMatches + contentMatches;
        if (totalMatches === 0) continue;

        // Extract up to 5 snippet lines containing any search term.
        const lines = content.split('\n');
        const snippets: Array<{lineNumber: number; text: string}> = [];
        for (let i = 0; i < lines.length && snippets.length < 5; i++) {
            const lineLower = lines[i].toLowerCase();
            if (terms.some(t => lineLower.includes(t))) {
                const text = lines[i].trim().slice(0, 200);
                snippets.push({lineNumber: i + 1, text});
            }
        }

        results.push({entry, snippets, matchCount: totalMatches});
    }

    // Sort by match count descending, then take top N.
    const limit = options?.limit ?? 10;
    return results.sort((a, b) => b.matchCount - a.matchCount).slice(0, limit);
}
