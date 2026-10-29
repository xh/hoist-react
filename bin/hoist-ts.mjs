#!/usr/bin/env node
//
// Hoist TypeScript CLI launcher. Runs mcp/cli/ts.ts under tsx - see impl/launch.mjs.
//
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';
import {launch} from './impl/launch.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
launch(resolve(__dirname, '..', 'mcp', 'cli', 'ts.ts'), {HOIST_MCP_QUIET: '1'});
