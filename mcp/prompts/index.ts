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

/**
 * Register all developer prompts on the given MCP server.
 *
 * Currently registers 3 stub prompts that will be replaced with full
 * implementations in Plan 02:
 * - `create-grid`: Generate a grid panel
 * - `create-form`: Generate a form with validation
 * - `create-tab-container`: Generate a tabbed interface
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
        async () => ({
            messages: [
                {
                    role: 'user' as const,
                    content: {
                        type: 'text' as const,
                        text: 'Placeholder: create-grid prompt will be implemented in Plan 02.'
                    }
                }
            ]
        })
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
        async () => ({
            messages: [
                {
                    role: 'user' as const,
                    content: {
                        type: 'text' as const,
                        text: 'Placeholder: create-form prompt will be implemented in Plan 02.'
                    }
                }
            ]
        })
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
        async () => ({
            messages: [
                {
                    role: 'user' as const,
                    content: {
                        type: 'text' as const,
                        text: 'Placeholder: create-tab-container prompt will be implemented in Plan 02.'
                    }
                }
            ]
        })
    );

    log.info('Registered 3 developer prompts');
}
