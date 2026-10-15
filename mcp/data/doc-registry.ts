/**
 * Document registry for the Hoist MCP server.
 *
 * Loads documentation inventory from `docs/doc-registry.json` -- the single
 * source of truth for hoist-react's documentation catalog. The same file is
 * also read by the toolbox doc viewer (toolbox's Grails `DocsService` resolves
 * it from a sibling checkout in local development or from a GitHub tarball in
 * production, then serves entries to the toolbox client).
 *
 * Companion libraries - packages that build on Hoist, such as `@xh/hoist-chat-kit` or a client
 * firm's own shared Hoist package - can add their docs to the same tools. A library opts in with
 * `"hoist": {"docRegistry": "<path>"}` in its package.json, pointing at a registry file in the
 * same JSON schema. {@link loadRegistry} finds opted-in packages among the direct dependencies of
 * the consuming app (see `resolveAppRoot()` in `util/paths.ts`) and merges their entries in,
 * with each id prefixed by the package name. See `docs/companion-library-docs.md`.
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
import {
    findInstalledPackage,
    readPackageJson,
    resolveAppRoot,
    resolveDocPath,
    resolveRepoRoot,
    type PackageJson
} from '../util/paths.js';

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
    /**
     * Unique identifier. For hoist-react docs, the file path relative to the repo root (e.g.
     * 'core/README.md'). For companion library docs, that path prefixed with the package name
     * (e.g. `@xh/hoist-chat-kit/core/README.md`).
     */
    id: string;
    /** File path relative to the owning package root, as declared in its registry. */
    path: string;
    /** Package name of the companion library that owns this doc, or null for hoist-react. */
    library: string | null;
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
     * for unambiguous cases. Declared unprefixed - the resolver scopes a
     * companion library's aliases under its package name.
     */
    aliases: string[];
}

/** A package whose docs are loaded: hoist-react itself, or an opted-in companion library. */
export interface DocLibrary {
    /** Package name, e.g. `@xh/hoist` or `@xh/hoist-chat-kit`. */
    name: string;
    version: string;
    /** The package.json description, for the server instructions. */
    description: string;
    /** Absolute package root on disk. */
    root: string;
    /** True for hoist-react, whose doc ids carry no prefix. */
    primary: boolean;
    /** Id of the library's `docs/README.md` index, if it registers one. */
    indexId: string | null;
    docCount: number;
}

/** Loaded registry data: entries, MCP category metadata, and the libraries they came from. */
export interface RegistryData {
    entries: DocEntry[];
    /** Union of categories across all libraries, hoist-react's first. */
    mcpCategories: McpCategory[];
    /** hoist-react first, then companion libraries in discovery order. */
    libraries: DocLibrary[];
    /** Companion library load problems - also logged, and reported by the ping surfaces. */
    warnings: string[];
}

//------------------------------------------------------------------
// JSON loading
//------------------------------------------------------------------

/**
 * Raw JSON structure of a doc registry file. Only `entries[].id` is required, so a companion
 * library can start with a minimal file. hoist-react's own registry fills in every field.
 */
interface RegistryJson {
    mcpCategories?: McpCategory[];
    viewerCategories?: Array<{id: string; title: string}>;
    entries?: Array<{
        id: string;
        title?: string;
        mcpCategory?: string;
        viewerCategory?: string;
        description?: string;
        keywords?: string[];
        aliases?: string[];
    }>;
}

/** Load and parse a registry file, or return null (and warn) if missing or invalid. */
function loadRegistryJson(jsonPath: string, warn: (msg: string) => void): RegistryJson | null {
    if (!existsSync(jsonPath)) {
        warn(`doc registry not found at ${jsonPath}`);
        return null;
    }
    try {
        return JSON.parse(readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
        warn(`doc registry at ${jsonPath} is not valid JSON: ${e}`);
        return null;
    }
}

//------------------------------------------------------------------
// Registry builder
//------------------------------------------------------------------

/** Package name of hoist-react, which owns the primary docs. */
export const HOIST_PACKAGE = '@xh/hoist';

/**
 * Build the complete document registry: hoist-react's docs, plus those of any companion
 * libraries discovered from `appRoot`. Omit `appRoot` to load hoist-react's docs alone.
 *
 * Each entry's file path is validated at build time; missing files are
 * logged and skipped.
 */
export function buildRegistry(
    repoRoot: string,
    {appRoot}: {appRoot?: string | null} = {}
): RegistryData {
    const warnings: string[] = [],
        hoistPkg = readPackageJson(repoRoot),
        primary = loadLibrary(
            repoRoot,
            hoistPkg ?? {name: HOIST_PACKAGE},
            'docs/doc-registry.json',
            true,
            msg => log.warn(msg)
        )!;

    const libraries = [primary.library],
        entries = [...primary.entries],
        mcpCategories = [...primary.mcpCategories];

    for (const {root, pkg} of appRoot ? discoverCompanionPackages(appRoot) : []) {
        const name = pkg.name!,
            warn = (msg: string) => {
                warnings.push(`${name}: ${msg}`);
                log.warn(`Companion library ${name}: ${msg}`);
            },
            loaded = loadLibrary(root, pkg, pkg.hoist!.docRegistry!, false, warn);
        if (!loaded) continue;

        // An unscoped package named like a hoist-react folder (e.g. `core`) could produce an id
        // that is already taken. Ids must be unique, so the first claimant keeps it.
        const taken = new Set(entries.map(e => e.id)),
            kept = loaded.entries.filter(e => {
                if (!taken.has(e.id)) return true;
                warn(`skipped "${e.path}": id "${e.id}" is already registered`);
                return false;
            });

        libraries.push({...loaded.library, docCount: kept.length});
        entries.push(...kept);
        for (const cat of loaded.mcpCategories) {
            if (!mcpCategories.some(c => c.id === cat.id)) mcpCategories.push(cat);
        }
    }

    const companions = libraries.length - 1;
    log.info(
        `Document registry built: ${entries.length} entries across ${new Set(entries.map(e => e.mcpCategory)).size} categories` +
            (companions
                ? `, including ${companions} companion librar${companions > 1 ? 'ies' : 'y'}`
                : '')
    );
    return {entries, mcpCategories, libraries, warnings};
}

/**
 * Load one library's registry, resolving each entry against the library's own root. Returns
 * null for a companion library whose registry cannot be read. hoist-react's own registry always
 * loads, if only as an empty one.
 */
function loadLibrary(
    root: string,
    pkg: PackageJson,
    registryPath: string,
    primary: boolean,
    warn: (msg: string) => void
): {library: DocLibrary; entries: DocEntry[]; mcpCategories: McpCategory[]} | null {
    const name = pkg.name ?? HOIST_PACKAGE;
    let json: RegistryJson | null = null;
    try {
        json = loadRegistryJson(resolveDocPath(root, registryPath), warn);
    } catch (e) {
        warn(`invalid docRegistry path "${registryPath}": ${(e as Error).message}`);
    }
    if (!json) {
        if (!primary) return null;
        json = {};
    }

    const entries: DocEntry[] = [];
    for (const raw of json.entries ?? []) {
        if (typeof raw?.id !== 'string' || !raw.id) {
            warn('skipped an entry with no id');
            continue;
        }

        let filePath: string;
        try {
            filePath = resolveDocPath(root, raw.id);
        } catch (e) {
            warn(`skipped "${raw.id}": ${(e as Error).message}`);
            continue;
        }
        if (!existsSync(filePath)) {
            warn(`skipped doc entry "${raw.id}": file not found at ${filePath}`);
            continue;
        }

        entries.push({
            id: primary ? raw.id : `${name}/${raw.id}`,
            path: raw.id,
            library: primary ? null : name,
            title: raw.title ?? raw.id,
            filePath,
            mcpCategory: raw.mcpCategory ?? 'package',
            description: raw.description ?? '',
            keywords: raw.keywords ?? [],
            aliases: raw.aliases ?? []
        });
    }

    // Categories the registry declares, then any an entry uses without declaring.
    const mcpCategories = [...(json.mcpCategories ?? [])];
    for (const id of new Set(entries.map(e => e.mcpCategory))) {
        if (!mcpCategories.some(c => c.id === id)) {
            mcpCategories.push({id, title: id.charAt(0).toUpperCase() + id.slice(1)});
        }
    }

    const index = entries.find(e => e.path === 'docs/README.md');
    return {
        library: {
            name,
            version: pkg.version ?? 'unknown',
            description: pkg.description ?? '',
            root,
            primary,
            indexId: index?.id ?? null,
            docCount: entries.length
        },
        entries,
        mcpCategories
    };
}

/**
 * Find opted-in companion packages: the app package itself, then its direct `dependencies` and
 * `devDependencies`. Transitive dependencies are not walked. `@xh/hoist` is skipped - its docs
 * are always loaded as the primary library.
 */
function discoverCompanionPackages(appRoot: string): Array<{root: string; pkg: PackageJson}> {
    const appPkg = readPackageJson(appRoot);
    if (!appPkg) return [];

    const candidates: Array<{root: string; pkg: PackageJson}> = [{root: appRoot, pkg: appPkg}],
        depNames = new Set([
            ...Object.keys(appPkg.dependencies ?? {}),
            ...Object.keys(appPkg.devDependencies ?? {})
        ]);
    for (const depName of depNames) {
        const root = findInstalledPackage(appRoot, depName),
            pkg = root ? readPackageJson(root) : null;
        if (root && pkg) candidates.push({root, pkg});
    }

    const seen = new Set<string>();
    return candidates.filter(({pkg}) => {
        if (!pkg.name || pkg.name === HOIST_PACKAGE || seen.has(pkg.name)) return false;
        if (typeof pkg.hoist?.docRegistry !== 'string') return false;
        seen.add(pkg.name);
        return true;
    });
}

/** Memoized registry shared by the MCP tools, resources, and server instructions. */
let cachedRegistry: RegistryData | undefined;

/**
 * Load the registry for this process: hoist-react's docs plus companion libraries discovered
 * from the consuming app. Built once and shared by every surface.
 */
export function loadRegistry(): RegistryData {
    cachedRegistry ??= buildRegistry(resolveRepoRoot(), {appRoot: resolveAppRoot()});
    return cachedRegistry;
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
