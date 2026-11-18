/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {describe, expect, it, vi} from 'vitest';

/**
 * The `@xh/hoist/utils/js` package, and `@xh/hoist/exception` beneath it, must load without
 * `@xh/hoist/core`. Core imports both, so a value import back into core creates an import cycle
 * that can leave exports such as `computeOnce` undefined while modules load.
 */
describe('@xh/hoist/utils/js', () => {
    it('loads without @xh/hoist/core', async () => {
        // 86.0.1 (6c7fa3f9a) fixed such a cycle, via ClipboardUtils, that broke @computeOnce.
        vi.resetModules();
        vi.doMock('@xh/hoist/core', () => {
            throw new Error('@xh/hoist/utils/js must not import @xh/hoist/core');
        });

        const {computeOnce} = await import('@xh/hoist/utils/js');
        expect(computeOnce).toBeTypeOf('function');
    });
});
