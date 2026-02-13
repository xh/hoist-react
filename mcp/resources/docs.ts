/**
 * MCP resource registrations for hoist-react documentation.
 *
 * Registers static resources for the doc index and coding conventions, plus a
 * URI template resource that serves any document by ID. All content is loaded
 * on-demand from the document registry built in `../data/doc-registry.ts`.
 */
import {McpServer, ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js';

import {buildRegistry, loadDocContent} from '../data/doc-registry.js';
import {log} from '../util/logger.js';
import {resolveRepoRoot} from '../util/paths.js';

/**
 * Register all documentation resources on the given MCP server.
 *
 * - `doc-index` (static): The docs/README.md index -- start here.
 * - `conventions` (static): The AGENTS.md coding conventions.
 * - `hoist-doc` (template): Read any doc by ID via `hoist://docs/{+docId}`.
 */
export function registerDocResources(server: McpServer): void {
    const registry = buildRegistry(resolveRepoRoot());

    const indexEntry = registry.find(e => e.id === 'index');
    const conventionsEntry = registry.find(e => e.id === 'conventions');

    //------------------------------------------------------------------
    // Static resource: doc-index
    //------------------------------------------------------------------
    if (indexEntry) {
        server.registerResource(
            'doc-index',
            'hoist://docs/index',
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
        log.warn('No "index" entry in registry -- skipping doc-index resource');
    }

    //------------------------------------------------------------------
    // Static resource: conventions
    //------------------------------------------------------------------
    if (conventionsEntry) {
        server.registerResource(
            'conventions',
            'hoist://docs/conventions',
            {
                title: 'Hoist Coding Conventions (AGENTS.md)',
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
        log.warn('No "conventions" entry in registry -- skipping conventions resource');
    }

    //------------------------------------------------------------------
    // Resource template: hoist-doc
    //------------------------------------------------------------------
    // Uses {+docId} (RFC 6570 reserved expansion) so slashes in doc IDs
    // (e.g. "cmp/grid") are preserved rather than percent-encoded.
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
                'Read any hoist-react doc by ID. Use the list to discover available document IDs.',
            mimeType: 'text/markdown'
        },
        async (uri, variables) => {
            const docId = variables.docId as string;
            const entry = registry.find(e => e.id === docId);

            if (!entry) {
                const availableIds = registry.map(e => e.id).join(', ');
                throw new Error(`Unknown document ID: "${docId}". Available IDs: ${availableIds}`);
            }

            return {
                contents: [{uri: uri.href, text: loadDocContent(entry), mimeType: 'text/markdown'}]
            };
        }
    );

    log.info(
        `Registered doc resources: doc-index, conventions, and ${registry.length} docs via hoist://docs/{+docId}`
    );
}
