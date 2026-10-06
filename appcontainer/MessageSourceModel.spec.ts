/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {MessageModel} from '@xh/hoist/appcontainer/MessageModel';
import {HoistRoute, MessageSuppressSpec, XH} from '@xh/hoist/core';
import {required} from '@xh/hoist/data';
import {initTestAppAsync, TestAppModel} from '@xh/hoist/test';
import {DAYS, HOURS, MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {afterEach, beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The modal message API - `XH.message()`, `alert()`, `confirm()` and `prompt()` - run headless
 * against the real MessageSourceModel, acting on the dialog's model as its buttons would. Apps
 * branch on exactly what these promises resolve to (true, false, null or an input value), and
 * `suppress` saves those responses in browser storage, where a mistake outlives the session.
 */
describe('MessageSourceModel', () => {
    beforeAll(async () => {
        await initTestAppAsync({modelClass: RoutedAppModel});
    });

    afterEach(() => {
        XH.appContainerModel.messageSourceModel.msgModels.forEach(m => m.close());
    });

    describe('confirm', () => {
        it('resolves true when confirmed', async () => {
            const result = XH.confirm({message: 'Delete 3 trades?'});
            await openMessage().doConfirmAsync();
            expect(await result).toBe(true);
        });

        it('resolves false when cancelled', async () => {
            const result = XH.confirm({message: 'Delete 3 trades?'});
            openMessage().doCancel();
            expect(await result).toBe(false);
        });

        it('focuses OK by default, or Cancel when requested for a risky action', () => {
            XH.confirm({message: 'Save changes?'});
            expect(openMessage().confirmProps.autoFocus).toBe(true);

            XH.confirm({message: 'Drop table?', cancelProps: {autoFocus: true}});
            expect(openMessage().confirmProps.autoFocus).toBeUndefined();
            expect(openMessage().cancelProps.autoFocus).toBe(true);
        });
    });

    describe('dismiss', () => {
        it('resolves false on escape, as if cancelled', async () => {
            const result = XH.confirm({message: 'Discard changes?'});
            openMessage().doEscape();
            expect(await result).toBe(false);
        });

        it('resolves null on escape when cancelOnDismiss is false', async () => {
            // Lets a caller tell "closed the dialog" apart from an explicit "Cancel".
            const result = XH.confirm({message: 'Discard changes?', cancelOnDismiss: false});
            openMessage().doEscape();
            expect(await result).toBeNull();
        });

        it('ignores escape for an alert, which must be acknowledged', async () => {
            const result = XH.alert({message: 'Session will expire in 5 minutes.'}),
                msg = openMessage();

            msg.doEscape();
            expect(msg.isOpen).toBe(true);

            await msg.doConfirmAsync();
            expect(await result).toBe(true);
        });
    });

    describe('prompt', () => {
        it('resolves to the entered value once it passes the input rules', async () => {
            const result = trackSettled(
                    XH.prompt({message: 'Name this view', input: {rules: [required]}})
                ),
                msg = openMessage();

            await msg.doConfirmAsync();
            expect(msg.isOpen).toBe(true);
            expect(result.settled).toBe(false);

            msg.formModel.getField('value').setValue('Q4 Positions');
            await msg.doConfirmAsync();
            expect(await result.promise).toBe('Q4 Positions');
        });
    });

    describe('extraConfirmText', () => {
        it('requires the exact text to be entered before confirming', async () => {
            const result = XH.confirm({message: 'Purge all records?', extraConfirmText: 'PURGE'}),
                msg = openMessage(),
                field = msg.formModel.getField('extraConfirm');

            expect(msg.extraConfirmLabel).toBe(`Enter 'PURGE' to confirm:`);

            field.setValue('purge');
            await msg.doConfirmAsync();
            expect(msg.isOpen).toBe(true);

            field.setValue('PURGE');
            await msg.doConfirmAsync();
            expect(await result).toBe(true);
        });
    });

    describe('messageKey', () => {
        it('replaces an open message with the same key', () => {
            XH.confirm({message: 'Reconnect?', messageKey: 'reconnect'});
            const first = openMessage();

            XH.confirm({message: 'Reconnect now?', messageKey: 'reconnect'});

            expect(first.isOpen).toBe(false);
            expect(openMessages()).toHaveLength(1);
            expect(openMessage().message).toBe('Reconnect now?');
        });

        it('resolves a replaced message with null', async () => {
            const first = XH.confirm({message: 'Reconnect?', messageKey: 'retry'});

            XH.confirm({message: 'Reconnect now?', messageKey: 'retry'});

            expect(await first).toBeNull();
        });
    });

    describe('route changes', () => {
        it('closes open messages, so the app does not navigate beneath a dialog', async () => {
            const result = XH.confirm({message: 'Delete 3 trades?'}),
                msg = openMessage();

            await navigateAsync('default.detail');

            expect(msg.isOpen).toBe(false);
            expect(openMessages()).toHaveLength(0);
            expect(await result).toBeNull();
        });
    });

    describe('suppress', () => {
        it('resolves later calls with a confirmed response, without showing the message', async () => {
            const spec = {message: 'Export all rows?', messageKey: 'exportAll', suppress: true},
                first = XH.confirm(spec);
            await confirmWithSuppress();
            expect(await first).toBe(true);

            expect(await XH.confirm(spec)).toBe(true);
            expect(openMessages()).toHaveLength(0);
        });

        it('saves nothing when the message is cancelled', async () => {
            const spec = {message: 'Export all rows?', messageKey: 'exportCancel', suppress: true},
                first = XH.confirm(spec),
                msg = openMessage();
            msg.formModel.getField('suppress').setValue(true);
            msg.doCancel();
            expect(await first).toBe(false);

            XH.confirm(spec);
            expect(openMessages()).toHaveLength(1);
        });

        it('shows the message again once the saved response expires', async () => {
            vi.useFakeTimers({toFake: ['Date'], now: new Date('2026-10-05T12:00:00')});
            const spec = {
                    message: 'Export all rows?',
                    messageKey: 'exportExpiry',
                    suppress: {expiry: 2 * DAYS}
                },
                first = XH.confirm(spec);
            await confirmWithSuppress();
            await first;

            vi.setSystemTime(new Date('2026-10-07T11:59:00'));
            expect(await XH.confirm(spec)).toBe(true);
            expect(openMessages()).toHaveLength(0);

            vi.setSystemTime(new Date('2026-10-07T12:01:00'));
            XH.confirm(spec);
            expect(openMessages()).toHaveLength(1);
        });

        it('forgets a session-scoped response when the session ends', async () => {
            const spec = {
                    message: 'Export all rows?',
                    messageKey: 'exportSession',
                    suppress: {storage: 'session'} as MessageSuppressSpec
                },
                first = XH.confirm(spec);
            await confirmWithSuppress();
            await first;
            expect(await XH.confirm(spec)).toBe(true);

            XH.sessionStorageService.clear(); // As for a new browser tab.
            XH.confirm(spec);
            expect(openMessages()).toHaveLength(1);
        });

        it.each<[string, MessageSuppressSpec, string]>([
            ['no expiry', {}, `Don't show this message again`],
            ['session storage', {storage: 'session'}, `Don't show this message again this session`],
            ['whole days', {expiry: 2 * DAYS}, `Don't show this message again for 2 days`],
            ['whole hours', {expiry: 36 * HOURS}, `Don't show this message again for 36 hours`],
            ['minutes', {expiry: 90 * MINUTES}, `Don't show this message again for 90 minutes`],
            ['seconds', {expiry: 90 * SECONDS}, `Don't show this message again for 2 minutes`]
        ])('labels the checkbox for %s', (_, suppress, label) => {
            const msg = new MessageModel({messageKey: 'labelled', suppress});
            onTestFinished(() => msg.destroy());
            expect(msg.suppressLabel).toBe(label);
        });
    });
});

class RoutedAppModel extends TestAppModel {
    override getRoutes(): HoistRoute[] {
        return [{name: 'default', path: '/app', children: [{name: 'detail', path: '/detail'}]}];
    }
}

function openMessages(): MessageModel[] {
    return XH.appContainerModel.messageSourceModel.msgModels.filter(it => it.isOpen);
}

// The most recently shown message still open - the one a user would be looking at.
function openMessage(): MessageModel {
    return openMessages().at(-1);
}

// Check "Don't show this message again" on the open message, then click OK.
async function confirmWithSuppress() {
    const msg = openMessage();
    msg.formModel.getField('suppress').setValue(true);
    await msg.doConfirmAsync();
}

function trackSettled<T>(promise: Promise<T>) {
    const ret = {promise, settled: false};
    promise.finally(() => (ret.settled = true));
    return ret;
}

function navigateAsync(routeName: string): Promise<void> {
    return new Promise((resolve, reject) =>
        XH.router.navigate(routeName, {}, err => (err ? reject(err) : resolve()))
    );
}
