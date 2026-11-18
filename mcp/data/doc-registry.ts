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
import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, posix, relative, resolve, sep} from 'node:path';

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
    /** What a companion doc's relative links resolve against. See {@link rewriteRelativeLinks}. */
    links?: DocLinkContext;
}

/** The docs and source location that a companion doc's relative links resolve against. */
export interface DocLinkContext {
    /** Package name, the prefix of each doc id. */
    library: string;
    /** Registry paths of the library's served docs. */
    docPaths: ReadonlySet<string>;
    /** Where agents find the package files. See {@link DocLibrary.sourcePath}. */
    sourcePath: string;
}

/** A package whose docs are loaded: hoist-react itself, or an opted-in companion library. */
export interface DocLibrary {
    /** Package name, e.g. `@xh/hoist` or `@xh/hoist-chat-kit`. */
    name: string;
    version: string;
    /** The package.json description, for the server instructions. */
    description: string;
    /** Absolute package root on disk, with symlinks resolved. */
    root: string;
    /**
     * Where agents find the package files: relative to the working directory when inside it,
     * else absolute. Under pnpm, the `node_modules` link rather than the store path.
     */
    sourcePath: string;
    /** True for hoist-react, whose doc ids carry no prefix. */
    primary: boolean;
    /** Id of the library's `docs/README.md` index, if it registers one. */
    indexId: string | null;
    docCount: number;
    /**
     * Guidance for agents from the library's `mcpInstructions`, for example which Hoist
     * components it replaces. The server instructions and ping surfaces show it. Always null for
     * hoist-react, whose guidance is the server instructions themselves.
     */
    instructions: string | null;
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
    /** Guidance for agents from a companion library. A string, or an array of lines. */
    mcpInstructions?: string | string[];
    viewerCategories?: Array<{id: string; title: string}>;
    entries?: Array<{
        id: string;
        title?: string;
        mcpCategory?: string;
        viewerCategory?: string;
        description?: string;
        keywords?: string[];
        aliases?: string[];
        /** `maintainers` to serve the doc only to agents working in the library's own repo. */
        mcpAudience?: string;
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
        isAppRoot = (root: string) => appRoot != null && samePath(root, appRoot),
        primary = loadLibrary(
            repoRoot,
            hoistPkg ?? {name: HOIST_PACKAGE},
            'docs/doc-registry.json',
            {primary: true, isAppRoot: isAppRoot(repoRoot), sourcePath: displayPath(repoRoot)},
            msg => log.warn(msg)
        )!;

    const libraries = [primary.library],
        entries = [...primary.entries],
        mcpCategories = [...primary.mcpCategories];

    for (const {path, pkg} of appRoot ? discoverCompanionPackages(appRoot) : []) {
        const name = pkg.name!,
            warn = (msg: string) => {
                warnings.push(`${name}: ${msg}`);
                log.warn(`Companion library ${name}: ${msg}`);
            },
            loaded = loadCompanion(path, pkg, isAppRoot(path), warn);
        if (!loaded) continue;

        // An unscoped package named like a hoist-react folder (e.g. `core`) could produce an id
        // that is already taken. Ids must be unique, so the first claimant keeps it.
        const taken = new Set(entries.map(e => e.id)),
            kept = loaded.entries.filter(e => {
                if (!taken.has(e.id)) return true;
                warn(`skipped "${e.path}": id "${e.id}" is already registered`);
                return false;
            });

        const links: DocLinkContext = {
            library: name,
            docPaths: new Set(kept.map(e => e.path)),
            sourcePath: loaded.library.sourcePath
        };
        libraries.push({...loaded.library, docCount: kept.length});
        entries.push(...kept.map(e => ({...e, links})));
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
 * Load a companion library, or return null. A library's files must never stop Hoist's own docs
 * from loading, so any error it causes becomes a warning.
 */
function loadCompanion(
    path: string,
    pkg: PackageJson,
    isAppRoot: boolean,
    warn: (msg: string) => void
): ReturnType<typeof loadLibrary> {
    try {
        return loadLibrary(
            realpathSync(path),
            pkg,
            pkg.hoist!.docRegistry!,
            {primary: false, isAppRoot, sourcePath: displayPath(path)},
            warn
        );
    } catch (e) {
        warn(`failed to load: ${(e as Error).message}`);
        return null;
    }
}

/** `path` relative to the working directory when inside it, else absolute. */
function displayPath(path: string): string {
    const rel = relative(process.cwd(), path);
    if (!rel) return '.';
    return rel.startsWith('..') || isAbsolute(rel) ? path : rel;
}

/** True if two paths name the same folder, following symlinks. */
function samePath(a: string, b: string): boolean {
    try {
        return realpathSync(a) === realpathSync(b);
    } catch {
        return resolve(a) === resolve(b);
    }
}

/**
 * Load one library's registry, resolving each entry against the library's own root. Returns
 * null for a companion library whose registry cannot be read. hoist-react's own registry always
 * loads, if only as an empty one.
 *
 * Entries with `mcpAudience: 'maintainers'` load only when the library is the app root - that
 * is, when an agent works in the library's own repo.
 */
function loadLibrary(
    root: string,
    pkg: PackageJson,
    registryPath: string,
    {primary, isAppRoot, sourcePath}: {primary: boolean; isAppRoot: boolean; sourcePath: string},
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

    const entries: DocEntry[] = [],
        realRoot = realpathSync(root);
    for (const raw of arrayField(json.entries, 'entries', warn)) {
        if (typeof raw?.id !== 'string' || !raw.id) {
            warn('skipped an entry with no id');
            continue;
        }
        if (raw.mcpAudience != null && raw.mcpAudience !== 'maintainers') {
            warn(`ignored mcpAudience "${raw.mcpAudience}" on "${raw.id}": expected "maintainers"`);
        }
        if (raw.mcpAudience === 'maintainers' && !isAppRoot) continue;

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
        if (!realpathSync(filePath).startsWith(realRoot + sep)) {
            warn(`skipped "${raw.id}": it links to a file outside the package root`);
            continue;
        }

        entries.push({
            id: primary ? raw.id : `${name}/${raw.id}`,
            path: raw.id,
            library: primary ? null : name,
            title: stringField(raw.title, raw.id),
            filePath,
            mcpCategory: stringField(raw.mcpCategory, 'package'),
            description: stringField(raw.description, ''),
            keywords: stringsField(raw.keywords),
            aliases: stringsField(raw.aliases)
        });
    }

    // Categories the registry declares, then any an entry uses without declaring.
    const mcpCategories = arrayField(json.mcpCategories, 'mcpCategories', warn)
        .filter(c => typeof c?.id === 'string' && c.id)
        .map(c => ({id: c.id, title: stringField(c.title, c.id)}));
    for (const id of new Set(entries.map(e => e.mcpCategory))) {
        if (!mcpCategories.some(c => c.id === id)) {
            mcpCategories.push({id, title: id.charAt(0).toUpperCase() + id.slice(1)});
        }
    }

    const index = entries.find(e => e.path === 'docs/README.md');
    return {
        library: {
            name,
            version: stringField(pkg.version, 'unknown'),
            description: stringField(pkg.description, ''),
            root,
            sourcePath,
            primary,
            indexId: index?.id ?? null,
            docCount: entries.length,
            instructions: primary ? null : parseInstructions(json.mcpInstructions, warn)
        },
        entries,
        mcpCategories
    };
}

/*
 * Field readers for registry and package.json values. Companion files come from any dependency,
 * so a field of the wrong type falls back to its default rather than throwing later.
 */
function stringField(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
}

function stringsField(value: unknown): string[] {
    return Array.isArray(value) ? value.filter(it => typeof it === 'string') : [];
}

function arrayField<T>(value: T[] | undefined, field: string, warn: (msg: string) => void): T[] {
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    warn(`ignored ${field}: expected an array`);
    return [];
}

/** Longest library guidance accepted, in characters. Longer guidance is cut, with a warning. */
export const MAX_LIBRARY_INSTRUCTIONS_CHARS = 1500;

/** Normalize `mcpInstructions` to trimmed, non-empty lines, or null if absent or invalid. */
function parseInstructions(
    raw: RegistryJson['mcpInstructions'],
    warn: (msg: string) => void
): string | null {
    if (raw == null) return null;
    const valid =
        typeof raw === 'string' || (Array.isArray(raw) && raw.every(it => typeof it === 'string'));
    if (!valid) {
        warn('ignored mcpInstructions: expected a string or an array of strings');
        return null;
    }

    const text = [raw]
        .flat()
        .join('\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n');
    if (text.length <= MAX_LIBRARY_INSTRUCTIONS_CHARS) return text || null;

    warn(`mcpInstructions cut to ${MAX_LIBRARY_INSTRUCTIONS_CHARS} of ${text.length} characters`);
    return text.slice(0, MAX_LIBRARY_INSTRUCTIONS_CHARS - 3) + '...';
}

/**
 * Find opted-in companion packages: the app package itself, then its direct `dependencies` and
 * `devDependencies`. Transitive dependencies are not walked. `@xh/hoist` is skipped - its docs
 * are always loaded as the primary library.
 */
function discoverCompanionPackages(appRoot: string): Array<{path: string; pkg: PackageJson}> {
    const appPkg = readPackageJson(appRoot);
    if (!appPkg) return [];

    const candidates: Array<{path: string; pkg: PackageJson}> = [{path: appRoot, pkg: appPkg}],
        depNames = new Set([
            ...Object.keys(appPkg.dependencies ?? {}),
            ...Object.keys(appPkg.devDependencies ?? {})
        ]);
    for (const depName of depNames) {
        const path = findInstalledPackage(appRoot, depName),
            pkg = path ? readPackageJson(path) : null;
        if (path && pkg) candidates.push({path, pkg});
    }

    const seen = new Set<string>();
    return candidates.filter(({pkg}) => {
        if (typeof pkg.name !== 'string' || !pkg.name) return false;
        if (pkg.name === HOIST_PACKAGE || seen.has(pkg.name)) return false;
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
 * Read and return the full content of a document. A companion library doc has its relative links
 * rewritten to full ids - see {@link rewriteRelativeLinks}.
 *
 * @throws Error if the file does not exist.
 */
export function loadDocContent(entry: DocEntry): string {
    if (!existsSync(entry.filePath)) {
        throw new Error(`Document file not found: "${entry.id}" at ${entry.filePath}`);
    }
    const content = readFileSync(entry.filePath, 'utf-8');
    return entry.links ? rewriteRelativeLinks(content, entry.path, entry.links) : content;
}

/** Inline link or image `](target`, capturing the lead and the target. */
const INLINE_LINK_RE = /(\]\(\s*<?)([^\s)>]+)/g;

/**
 * A whole line that is a link reference definition, `[label]: target` with an optional title.
 * Captures the lead, the target, and the rest. Excludes footnotes (`[^1]: text`) and prose such as
 * `[Note]: remember this`, whose text after the target is not a title.
 */
const REF_DEF_RE =
    /^(\s{0,3}\[(?!\^)[^\]]+\]:\s*<?)([^\s>]+)(>?(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*)$/;

/**
 * Fence that opens or closes a markdown code block. Any indent, so a fence nested in a list
 * item counts too.
 */
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

/**
 * Rewrite relative links in a companion library doc so an agent can follow them. Read as
 * written, `../core/README.md` in `@xh/hoist-chat-kit/docs/architecture.md` sends an agent to
 * hoist-react's `core/README.md`, with no error to tell it the doc is the wrong one.
 *
 * A link to a served doc becomes its full id, prefixed with the package name. A link to any other
 * file in the package, such as source or a doc not served here, becomes a file path under
 * {@link DocLinkContext.sourcePath}. Leaves anchors, absolute paths, URLs, links that leave the
 * package root, and code as they are. Keeps line numbers unchanged, so section line ranges still
 * match the file.
 */
export function rewriteRelativeLinks(
    content: string,
    docPath: string,
    {library, docPaths, sourcePath}: DocLinkContext
): string {
    const docDir = posix.dirname(docPath);
    // The open fence, if inside a code block. It closes on a fence of the same character, at
    // least as long.
    let openFence: string | null = null;
    return content
        .split('\n')
        .map(line => {
            const fence = FENCE_RE.exec(line)?.[1];
            if (fence) {
                if (!openFence) {
                    openFence = fence;
                } else if (fence[0] === openFence[0] && fence.length >= openFence.length) {
                    openFence = null;
                }
                return line;
            }
            if (openFence) return line;
            const def = REF_DEF_RE.exec(line);
            if (def) return def[1] + rewrite(def[2]) + def[3];
            // Odd segments are inline code spans, left as written.
            return line
                .split(/(`+[^`]*`+)/)
                .map((seg, i) =>
                    i % 2 ? seg : seg.replace(INLINE_LINK_RE, (_, lead, t) => lead + rewrite(t))
                )
                .join('');
        })
        .join('\n');

    function rewrite(target: string): string {
        if (/^([a-z][a-z0-9+.-]*:|[#/])/i.test(target)) return target;
        const hashAt = target.indexOf('#'),
            path = hashAt < 0 ? target : target.slice(0, hashAt),
            anchor = hashAt < 0 ? '' : target.slice(hashAt),
            resolved = posix.normalize(posix.join(docDir, path));
        if (resolved === '..' || resolved.startsWith('../')) return target;
        if (resolved === '.') return library + anchor;
        const rewritten = docPaths.has(resolved)
            ? `${library}/${resolved}`
            : posix.join(sourcePath.split(sep).join('/'), resolved);
        return rewritten + anchor;
    }
}
