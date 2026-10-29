#!/usr/bin/env node
//
// Hoist MCP Server launcher. Runs mcp/server.ts under tsx - see impl/launch.mjs.
//
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';
import {launch} from './impl/launch.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
launch(resolve(__dirname, '..', 'mcp', 'server.ts'));
