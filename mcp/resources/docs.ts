/**
 * MCP resource registrations for hoist-react documentation.
 *
 * Registers static resources for the doc index and coding conventions, plus a
 * URI template resource that serves any document by ID, companion library docs included. All
 * content is loaded on-demand from the document registry built in `../data/doc-registry.ts`.
 */
import {McpServer, ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js';

import {loadDocContent, loadRegistry, type RegistryData} from '../data/doc-registry.js';
import {resolveDocId} from '../data/doc-id-resolver.js';
import {log} from '../util/logger.js';

/**
 * Register all documentation resources on the given MCP server.
 *
 * - `doc-index` (static): The docs/README.md index -- start here.
 * - `conventions` (static): The coding conventions doc.
 * - `hoist-doc` (template): Read any doc by ID via `hoist://docs/{+docId}`.
 *
 * Pass `data` to serve a specific registry (specs do). By default, loads the shared registry.
 */
export function registerDocResources(server: McpServer, data: RegistryData = loadRegistry()): void {
    const {entries: registry} = data;

    const indexEntry = registry.find(e => e.id === 'docs/README.md');
    const conventionsEntry = registry.find(e => e.id === 'docs/coding-conventions.md');

    //------------------------------------------------------------------
    // Static resource: doc-index
    //------------------------------------------------------------------
    if (indexEntry) {
        server.registerResource(
            'doc-index',
            `hoist://docs/${indexEntry.id}`,
            {
                title: 'Hoist Documentation Index',
                description:
                    'Complete catalog of all hoist-react documentation with descriptions and key topics. Start here to discover available docs.',
                mimeType: 'text/markdown'
            },
            async uri => ({
                contents: [
                    {uri: uri.href, text: loadDocContent(indexEntry), mimeType: 'text/markdown'}
                ]
            })
        );
    } else {
        log.warn('No "docs/README.md" entry in registry -- skipping doc-index resource');
    }

    //------------------------------------------------------------------
    // Static resource: conventions
    //------------------------------------------------------------------
    if (conventionsEntry) {
        server.registerResource(
            'conventions',
            `hoist://docs/${conventionsEntry.id}`,
            {
                title: 'Hoist Coding Conventions',
                description:
                    'Architecture patterns, code style, key dependencies, and AI assistant guidance for hoist-react development.',
                mimeType: 'text/markdown'
            },
            async uri => ({
                contents: [
                    {
                        uri: uri.href,
                        text: loadDocContent(conventionsEntry),
                        mimeType: 'text/markdown'
                    }
                ]
            })
        );
    } else {
        log.warn(
            'No "docs/coding-conventions.md" entry in registry -- skipping conventions resource'
        );
    }

    //------------------------------------------------------------------
    // Resource template: hoist-doc
    //------------------------------------------------------------------
    // Uses {+docId} (RFC 6570 reserved expansion) so slashes in doc IDs
    // (e.g. "cmp/grid/README.md") are preserved rather than percent-encoded. The `@` that
    // starts a scoped companion library id is a reserved character, so it passes through too.
    const template = new ResourceTemplate('hoist://docs/{+docId}', {
        list: async () => ({
            resources: registry.map(entry => ({
                uri: `hoist://docs/${entry.id}`,
                name: entry.title,
                description: entry.description,
                mimeType: 'text/markdown' as const
            }))
        }),
        complete: {
            docId: (value: string) => registry.filter(e => e.id.startsWith(value)).map(e => e.id)
        }
    });

    server.registerResource(
        'hoist-doc',
        template,
        {
            title: 'Hoist Documentation',
            description:
                'Read any hoist-react doc by ID, or a companion library doc by its package-prefixed ID. Use the list to discover available document IDs.',
            mimeType: 'text/markdown'
        },
        async (uri, variables) => {
            const docId = variables.docId as string;
            // Tolerant resolution: exact match always wins, then trivial normalization,
            // alias lookup (auto-generated shortenings like dropped `/README.md`, dropped
            // `docs/` prefix, and last-segment shortcuts, plus explicit registry aliases),
            // then suffix completion as a fallback. See mcp/data/doc-id-resolver.ts for the
            // full tier ordering.
            const result = resolveDocId(registry, docId);

            if (result.kind === 'unknown') {
                const tail =
                    result.suggestions.length > 0
                        ? `Did you mean one of: ${result.suggestions.join(', ')}?`
                        : 'Use the doc list to discover valid IDs.';
                throw new Error(`Unknown document ID: "${docId}". ${tail}`);
            }

            return {
                contents: [
                    {
                        uri: uri.href,
                        text: loadDocContent(result.entry),
                        mimeType: 'text/markdown'
                    }
                ]
            };
        }
    );

    log.info(
        `Registered doc resources: doc-index, conventions, and ${registry.length} docs via hoist://docs/{+docId}`
    );
}
