/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AppSpec, HoistAppModel, XH} from '@xh/hoist/core';
import {when} from 'mobx';
import {vi} from 'vitest';
import {hoistCore} from './hoistCore';

export type TestAppSpec = Partial<ConstructorParameters<typeof AppSpec>[0]>;

/**
 * Boot a headless Hoist app against the fake hoist-core in `test-support/hoistCore.ts`.
 *
 * Runs the real `AppContainerModel.initAsync()` - the same sequence a browser runs on page load:
 * authenticate via `xh/authStatus`, install every Hoist service (loading environment, configs and
 * prefs from the server), then init the app model and start the router. Nothing is rendered.
 *
 * Call once per test file, typically from `beforeAll()`. Vitest gives each file a fresh module
 * graph, and with it a fresh `XH`. Adjust `hoistCore` state first to boot against other server
 * data (e.g. `hoistCore.configs.myConfig = 42`).
 *
 * Resolves once the app is `RUNNING` and the requests boot started have finished. Rejects, naming
 * `XH.appState`, if boot stops anywhere else - `ACCESS_DENIED`, `LOAD_FAILED`, or
 * `LOGIN_REQUIRED`, where boot waits for the user to sign in. Also rejects if boot triggers a
 * problem that the kit's guards catch, such as a request the fake does not handle. Logs any error
 * that the app handles during boot.
 *
 * @param spec - overrides for the test app's `AppSpec`. Defaults to a desktop app with a minimal
 *      app model, open to any user. Pass `checkAccess` to require a role.
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
        checkAccess: () => true,
        disableWebSockets: true,
        trackAppLoad: false,
        ...spec,
        isMobileApp
    });

    // initAsync() reports a failed boot via XH.handleException - capture it to fail loudly here.
    // Log each call instead of showing it, as an app may handle an error at boot on purpose.
    // Read the reported error before restoring the spy, which clears its recorded calls.
    // At LOGIN_REQUIRED, initAsync() waits for a sign-in that never comes, so stop waiting there.
    const handleException = vi
            .spyOn(XH, 'handleException')
            .mockImplementation(e => console.error('Error handled during test app boot:', e)),
        loginRequired = when(() => XH.appState === 'LOGIN_REQUIRED');

    // Take the problems the kit's guards catch during boot, to fail the boot rather than the
    // file's first test.
    const bootProblems: string[] = [],
        {onProblem} = hoistCore;
    hoistCore.onProblem = msg => bootProblems.push(msg);

    let cause: unknown;
    try {
        try {
            await Promise.race([acm.initAsync(), loginRequired]);
        } finally {
            loginRequired.cancel();
            // A failed boot reports its error last - any before it, the app handled.
            cause = handleException.mock.calls.at(-1)?.[0];
            handleException.mockRestore();
        }
        // Let requests that boot started without awaiting finish now, so none lands in the first
        // test's request log.
        await hoistCore.settleAsync().catch(e => bootProblems.push(e.message));
    } finally {
        hoistCore.onProblem = onProblem;
    }

    if (XH.appState !== 'RUNNING') {
        throw new Error(`Test app failed to start - state is '${XH.appState}'`, {cause});
    }

    if (bootProblems.length) {
        const msg = bootProblems.join('\n');
        throw new Error(
            `Test app triggered problems during boot that Hoist would otherwise swallow:\n${msg}`
        );
    }
}

/** Default app model for test apps. */
export class TestAppModel extends HoistAppModel {}
