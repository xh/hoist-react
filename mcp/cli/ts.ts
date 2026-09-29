/**
 * CLI entry point for hoist-ts -- TypeScript symbol search and inspection. The command itself
 * is defined in `ts-command.ts`.
 */
import {createTsCommand} from './ts-command.js';

await createTsCommand().parseAsync();
