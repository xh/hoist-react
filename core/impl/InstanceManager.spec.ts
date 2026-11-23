/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {setFlagsFromString} from 'node:v8';
import {runInNewContext} from 'node:vm';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * InstanceManager catalogs every model for XH.getModels() and the Inspector. It must not be what
 * keeps a model in memory - a model that is never destroyed is still collected once nothing else
 * references it.
 */
beforeAll(() => initTestAppAsync());

describe('InstanceManager', () => {
    it('lists a model until it is destroyed', async () => {
        const model = new TestModel();
        await wait(); // registration is async
        expect(XH.getModels(TestModel)).toContain(model);

        model.destroy();
        await wait();
        expect(XH.getModels(TestModel)).not.toContain(model);
    });

    it('does not keep an undestroyed model in memory', async () => {
        const ref = await createAbandonedModelAsync();
        collectGarbage();
        expect(ref.deref()).toBeUndefined();
    });
});

//------------------
// Test support
//------------------
class TestModel extends HoistModel {}

/** Create a model, let it register, and return only a weak reference to it. */
async function createAbandonedModelAsync(): Promise<WeakRef<TestModel>> {
    const ref = new WeakRef(new TestModel());
    await wait();
    return ref;
}

function collectGarbage() {
    setFlagsFromString('--expose-gc');
    (runInNewContext('gc') as () => void)();
}
