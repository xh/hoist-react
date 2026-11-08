/**
 * Schema conformance checks for the Hoist Docs index built from this checkout. The service
 * refuses an index whose shape it does not expect, so these guard the contract described in the
 * hoist-docs repo's `docs/index-schema.md`.
 *
 * Run: pnpm test:docs-index
 */
import assert from 'node:assert/strict';
import {before, describe, it} from 'node:test';

import {buildIndex, SCHEMA_VERSION} from './build-index.js';

process.env.HOIST_MCP_QUIET = '1';

describe('buildIndex', () => {
    let index: any;
    before(async () => {
        index = await buildIndex();
    });

    it('declares the schema version and library', () => {
        assert.equal(index.schemaVersion, SCHEMA_VERSION);
        assert.equal(index.library.id, 'react');
        assert.equal(index.library.name, '@xh/hoist');
        assert.equal(index.library.language, 'typescript');
        assert.ok(index.library.version);
    });

    it('includes every registered doc with its markdown and categories', () => {
        const {docs} = index;
        assert.ok(docs.entries.length > 50);
        assert.ok(docs.mcpCategories.length > 0 && docs.viewerCategories.length > 0);
        for (const e of docs.entries) {
            assert.ok(e.id && e.title && e.mcpCategory, `doc ${e.id}`);
            assert.equal(typeof e.markdown, 'string', `doc ${e.id}`);
            assert.ok(Array.isArray(e.keywords) && Array.isArray(e.aliases), `doc ${e.id}`);
        }
    });

    it('uses library-relative file paths for symbols and members', () => {
        for (const s of index.symbols) assert.ok(!s.filePath.startsWith('/'), s.filePath);
        for (const m of index.memberIndex) assert.ok(!m.filePath.startsWith('/'), m.filePath);
    });

    it('precomputes detail and members', () => {
        const gridModel = index.symbols.find((s: any) => s.name === 'GridModel');
        assert.equal(gridModel.importPath, '@xh/hoist/cmp/grid');
        assert.ok(gridModel.signature.includes('class GridModel'));
        assert.ok(gridModel.members.some((m: any) => m.name === 'sortBy'));

        const xh = index.symbols.find((s: any) => s.name === 'XH' && s.kind === 'const');
        assert.equal(xh.instanceOf, 'XHApi');
    });

    it('does not index its own source', () => {
        assert.ok(!index.symbols.some((s: any) => s.filePath.startsWith('docs-index/')));
    });
});
