/**
 * Document registry for the Hoist MCP server.
 *
 * Loads documentation inventory from docs/doc-registry.json, the single source
 * of truth shared with the hoist-core MCP server and the toolbox doc viewer.
 * Provides metadata, file loading, and keyword-based search.
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
    mcpCategory?: string;
    limit?: number;
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
            keywords: raw.keywords ?? []
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
        // Filter by mcpCategory if specified.
        if (
            options?.mcpCategory &&
            options.mcpCategory !== 'all' &&
            entry.mcpCategory !== options.mcpCategory
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
