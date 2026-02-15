/**
 * MCP prompt registrations for hoist-react developer workflows.
 *
 * Registers developer prompts that compose documentation excerpts, type
 * signatures, and code patterns into structured starting points for common
 * Hoist development tasks. Each prompt surfaces as a slash command in Claude
 * Code (e.g. `/mcp__hoist-react__create-grid`).
 *
 * Prompt names are NOT prefixed with `hoist-` because the MCP server name
 * (`hoist-react`) already provides that context. See research Pitfall 3.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {log} from '../util/logger.js';
import {buildGridPrompt} from './grid.js';
import {buildFormPrompt} from './form.js';
import {buildTabsPrompt} from './tabs.js';

/**
 * Register all developer prompts on the given MCP server.
 *
 * Each prompt composes relevant documentation, type signatures, conventions,
 * and code templates into structured output that gives an LLM everything it
 * needs to generate correct Hoist-idiomatic code:
 * - `create-grid`: Generate a grid panel with model, columns, and data loading
 * - `create-form`: Generate a form with validation and input binding
 * - `create-tab-container`: Generate a tabbed interface with routing support
 */
export function registerPrompts(server: McpServer): void {
    //------------------------------------------------------------------
    // Prompt: create-grid
    //------------------------------------------------------------------
    server.registerPrompt(
        'create-grid',
        {
            title: 'Create a Hoist Grid Panel',
            description:
                'Generate a grid panel with model, columns, data loading, and component. ' +
                'Combines documentation excerpts, type signatures, and code patterns ' +
                'into a structured starting point.',
            argsSchema: {
                dataFields: z
                    .string()
                    .optional()
                    .describe('Comma-separated data field names (e.g. "name,value,date")'),
                features: z
                    .string()
                    .optional()
                    .describe(
                        'Features to include: sorting, grouping, selection, export, filtering, treeMode'
                    )
            }
        },
        async ({dataFields, features}) => buildGridPrompt({dataFields, features})
    );

    //------------------------------------------------------------------
    // Prompt: create-form
    //------------------------------------------------------------------
    server.registerPrompt(
        'create-form',
        {
            title: 'Create a Hoist Form',
            description:
                'Generate a form with model, field definitions, validation rules, and component. ' +
                'Combines documentation excerpts, type signatures, and code patterns ' +
                'into a structured starting point.',
            argsSchema: {
                fields: z
                    .string()
                    .optional()
                    .describe('Comma-separated field names (e.g. "firstName,lastName,email,age")'),
                validation: z
                    .string()
                    .optional()
                    .describe('Whether to include validation examples (e.g. "true" or "false")')
            }
        },
        async ({fields, validation}) => buildFormPrompt({fields, validation})
    );

    //------------------------------------------------------------------
    // Prompt: create-tab-container
    //------------------------------------------------------------------
    server.registerPrompt(
        'create-tab-container',
        {
            title: 'Create a Hoist Tab Container',
            description:
                'Generate a tabbed interface with model configuration and content panels. ' +
                'Combines documentation excerpts, type signatures, and code patterns ' +
                'into a structured starting point.',
            argsSchema: {
                tabs: z
                    .string()
                    .optional()
                    .describe('Comma-separated tab names (e.g. "overview,details,history")'),
                routing: z
                    .string()
                    .optional()
                    .describe('Whether to include route integration (e.g. "true" or "false")')
            }
        },
        async ({tabs, routing}) => buildTabsPrompt({tabs, routing})
    );

    log.info('Registered 3 developer prompts');
}
