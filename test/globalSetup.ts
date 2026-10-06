/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {readdirSync} from 'node:fs';
import {join, relative} from 'node:path';

/**
 * Global setup, run once by Vitest before any test file.
 *
 * Fails the run if a test file sits outside `test/`, or is not named `*.spec.ts`. Vitest only
 * collects `test/**\/*.spec.ts`, so a misplaced file would never run - and nothing would say so.
 * Specs beside the code they test are a common default elsewhere, but this repo keeps all test
 * code in `test/`. See docs/unit-testing.md.
 */
export function setup() {
    const root = join(import.meta.dirname, '..'),
        misplaced = findTestFiles(root, root)
            .filter(path => !/^test\/.+\.spec\.ts$/.test(path))
            .map(path => `  ${path}  ->  ${expectedPath(path)}`);

    if (misplaced.length) {
        throw new Error(
            'Unit test files must live in test/, mirroring the library, and be named *.spec.ts. ' +
                'Move these files (see docs/unit-testing.md):\n' +
                misplaced.join('\n')
        );
    }
}

//------------------------
// Implementation
//------------------------
// Folders never searched - dependencies, build output, and the MCP tools' own node:test specs.
const SKIP_DIRS = new Set(['node_modules', 'build', 'mcp']);

const TEST_FILE = /\.(spec|test)\.[cm]?[jt]sx?$/;

function findTestFiles(dir: string, root: string): string[] {
    return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
        if (entry.name.startsWith('.')) return [];
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            return SKIP_DIRS.has(entry.name) ? [] : findTestFiles(path, root);
        }
        return TEST_FILE.test(entry.name) ? [relative(root, path)] : [];
    });
}

// Where a misplaced file belongs - e.g. data/Store.test.ts -> test/data/Store.spec.ts.
function expectedPath(path: string): string {
    const base = path.replace(/^test\//, '').replace(TEST_FILE, '.spec.ts');
    return `test/${base}`;
}
