/**
 * Document registry for the Hoist MCP server.
 *
 * Loads documentation inventory from `docs/doc-registry.json` -- the single
 * source of truth for hoist-react's documentation catalog. The same file is
 * also read by the toolbox doc viewer (toolbox's Grails `DocsService` resolves
 * it from a sibling checkout in local development or from a GitHub tarball in
 * production, then serves entries to the toolbox client).
 *
 * Hoist-core maintains a *separate* registry of server-side docs at its own
 * `docs/doc-registry.json`, consumed by its own (Groovy) MCP server. The two
 * registries use the same JSON schema, but the files and entries are
 * independent -- changes here do not propagate there and vice versa.
 *
 * Provides metadata and file loading. Search lives in `doc-search.ts`, and the section model
 * used for search and targeted reads lives in `doc-sections.ts`.
 */
import {existsSync, readFileSync} from 'node:fs';

import {log} from '../util/logger.js';
import {resolveDocPath} from '../util/paths.js';

//------------------------------------------------------------------
// Types
//------------------------------------------------------------------

/** MCP category metadata from the JSON registry. */
export interface McpCategory {
    id: string;
    title: string;
}

/** A single document in the registry. */
export interface DocEntry {
    /** Unique identifier AND relative file path (e.g. 'core/README.md', 'docs/lifecycle-app.md'). */
    id: string;
    /** Display title, e.g. 'Core Framework', 'Grid Component'. */
    title: string;
    /** Absolute file path on disk. */
    filePath: string;
    /** MCP category for filtering. */
    mcpCategory: string;
    /** Short description from the docs index. */
    description: string;
    /** Key topics/keywords for search matching. */
    keywords: string[];
    /**
     * Optional curated shortcut IDs accepted by the doc-id resolver. Use only
     * when the doc has an obvious short name that would otherwise be ambiguous
     * across multiple entries -- the resolver auto-generates safe shortenings
     * for unambiguous cases.
     */
    aliases: string[];
}

//------------------------------------------------------------------
// JSON loading
//------------------------------------------------------------------

/** Raw JSON structure of docs/doc-registry.json. */
interface RegistryJson {
    mcpCategories: McpCategory[];
    viewerCategories: Array<{id: string; title: string}>;
    entries: Array<{
        id: string;
        title: string;
        mcpCategory: string;
        viewerCategory: string;
        description: string;
        keywords: string[];
        aliases?: string[];
    }>;
}

/** Loaded registry data: entries + MCP category metadata. */
export interface RegistryData {
    entries: DocEntry[];
    mcpCategories: McpCategory[];
}

/** Load and parse docs/doc-registry.json from the repo root. */
function loadRegistryJson(repoRoot: string): RegistryJson {
    const jsonPath = resolveDocPath(repoRoot, 'docs/doc-registry.json');
    if (!existsSync(jsonPath)) {
        log.warn('docs/doc-registry.json not found');
        return {mcpCategories: [], viewerCategories: [], entries: []};
    }
    return JSON.parse(readFileSync(jsonPath, 'utf-8'));
}

//------------------------------------------------------------------
// Registry builder
//------------------------------------------------------------------

/**
 * Build the complete document registry from docs/doc-registry.json.
 *
 * Each entry's file path is validated at build time; missing files are
 * logged and skipped.
 */
export function buildRegistry(repoRoot: string): RegistryData {
    const json = loadRegistryJson(repoRoot);
    const entries: DocEntry[] = [];

    for (const raw of json.entries) {
        const filePath = resolveDocPath(repoRoot, raw.id);

        if (!existsSync(filePath)) {
            log.warn(`Skipping doc entry "${raw.id}": file not found at ${filePath}`);
            continue;
        }

        entries.push({
            id: raw.id,
            title: raw.title,
            filePath,
            mcpCategory: raw.mcpCategory,
            description: raw.description,
            keywords: raw.keywords ?? [],
            aliases: raw.aliases ?? []
        });
    }

    log.info(
        `Document registry built: ${entries.length} entries across ${new Set(entries.map(e => e.mcpCategory)).size} categories`
    );
    return {entries, mcpCategories: json.mcpCategories ?? []};
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
