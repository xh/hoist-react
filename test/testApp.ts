/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AppSpec, HoistAppModel, XH} from '@xh/hoist/core';
import {vi} from 'vitest';

export type TestAppSpec = Partial<ConstructorParameters<typeof AppSpec>[0]>;

/**
 * Boot a headless Hoist app against the fake hoist-core in `test/hoistCore.ts`.
 *
 * Runs the real `AppContainerModel.initAsync()` - the same sequence a browser runs on page load:
 * authenticate via `xh/authStatus`, install every Hoist service (loading environment, configs and
 * prefs from the server), then init the app model and start the router. Nothing is rendered.
 *
 * Call once per test file, typically from `beforeAll()`. Vitest gives each file a fresh module
 * graph, and with it a fresh `XH`. Adjust `hoistCore` state first to boot against other server
 * data (e.g. `hoistCore.configs.myConfig = 42`).
 *
 * @param spec - overrides for the test app's `AppSpec`. Defaults to a desktop app with a minimal
 *      app model, which requires the `APP_USER` role.
 */
export async function initTestAppAsync(spec: TestAppSpec = {}): Promise<void> {
    const isMobileApp = spec.isMobileApp ?? false,
        // The real platform container - importing it registers the platform's component impls.
        {AppContainer} = isMobileApp
            ? await import('@xh/hoist/mobile/appcontainer/AppContainer')
            : await import('@xh/hoist/desktop/appcontainer/AppContainer');

    const acm = XH.appContainerModel;
    acm.appSpec = new AppSpec({
        componentClass: () => null,
        containerClass: AppContainer,
        modelClass: TestAppModel,
        checkAccess: 'APP_USER',
        disableWebSockets: true,
        trackAppLoad: false,
        ...spec,
        isMobileApp
    });

    // initAsync() reports a failed boot via XH.handleException - capture it to fail loudly here.
    // Read the reported error before restoring the spy, which clears its recorded calls.
    const handleException = vi.spyOn(XH, 'handleException').mockImplementation(() => {});
    let cause: unknown;
    try {
        await acm.initAsync();
    } finally {
        cause = handleException.mock.calls[0]?.[0];
        handleException.mockRestore();
    }

    if (XH.appState !== 'RUNNING') {
        throw new Error(`Test app failed to start - state is '${XH.appState}'`, {cause});
    }
}

/** Default app model for test apps. */
export class TestAppModel extends HoistAppModel {}
