/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {beforeAll, describe, expect, it, vi} from 'vitest';

// An ag-Grid outside the range this version of Hoist supports, as a stale install can resolve.
vi.mock('ag-grid-community', async importOriginal => {
    const orig: any = await importOriginal();
    return {
        ...orig,
        ClientSideRowModelModule: {...orig.ClientSideRowModelModule, version: '35.0.0'}
    };
});

/**
 * Without ag-Grid, every grid renders only a placeholder. A component spec that checks only model
 * state, or that something is absent, would then pass without testing a grid.
 */
describe('installAgGridForTests', () => {
    beforeAll(() => initTestAppAsync());

    // 90.0.0 (#4868) - logged the version mismatch and continued without ag-Grid.
    it('throws when ag-Grid is outside the supported range', () => {
        expect(() => installAgGridForTests()).toThrow('ag-Grid 35.0.0 is not supported');
    });
});
