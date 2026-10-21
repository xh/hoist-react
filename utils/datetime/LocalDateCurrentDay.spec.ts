/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCore, initTestAppAsync} from '@xh/hoist/test-support';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * Resolving "today" in the app and server time zones for a user in another zone. The math combines
 * the browser offset, which EnvironmentService derives from the west-positive
 * `getTimezoneOffset()`, with the east-positive offsets hoist-core sends. A sign slip moves the
 * user's business date by a day. DateRangePickerModel's `'appDay'` anchor relies on it.
 *
 * The browser runs in America/New_York (see vitest.config.mts).
 */
describe('LocalDate', () => {
    beforeAll(async () => {
        Object.assign(hoistCore.environment, {
            appTimeZone: 'Asia/Tokyo',
            serverTimeZone: 'America/Los_Angeles'
        });

        // Boot on a summer date, so EnvironmentService reads the browser offset as EDT (-4h).
        vi.useFakeTimers({toFake: ['Date'], now: new Date(2025, 8, 15, 12)});
        try {
            await initTestAppAsync();
        } finally {
            vi.useRealTimers();
        }
    });

    describe('currentAppDay', () => {
        it('rolls over at midnight in an app zone ahead of the browser', () => {
            // Midnight in Tokyo is 11:00 in New York.
            vi.useFakeTimers({toFake: ['Date'], now: new Date(2025, 8, 15, 10, 59, 59)});
            expect(LocalDate.currentAppDay()).toBe(LocalDate.get('2025-09-15'));

            vi.setSystemTime(new Date(2025, 8, 15, 11));
            expect(LocalDate.currentAppDay()).toBe(LocalDate.get('2025-09-16'));
            expect(LocalDate.today()).toBe(LocalDate.get('2025-09-15'));
        });
    });

    describe('currentServerDay', () => {
        it('rolls over at midnight in a server zone behind the browser', () => {
            // Midnight in Los Angeles is 03:00 in New York.
            vi.useFakeTimers({toFake: ['Date'], now: new Date(2025, 8, 16, 2, 59, 59)});
            expect(LocalDate.currentServerDay()).toBe(LocalDate.get('2025-09-15'));
            expect(LocalDate.today()).toBe(LocalDate.get('2025-09-16'));

            vi.setSystemTime(new Date(2025, 8, 16, 3));
            expect(LocalDate.currentServerDay()).toBe(LocalDate.get('2025-09-16'));
        });
    });
});
