/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {UserAgentModel} from './UserAgentModel';

const UAS = {
    desktop:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    phone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    tablet: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
};

function createModel(ua: string) {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
    return new UserAgentModel();
}

describe('UserAgentModel', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('classifies a desktop browser', () => {
        const model = createModel(UAS.desktop);
        expect([model.isDesktop, model.isPhone, model.isTablet]).toEqual([true, false, false]);
    });

    it('classifies a phone', () => {
        const model = createModel(UAS.phone);
        expect([model.isDesktop, model.isPhone, model.isTablet]).toEqual([false, true, false]);
    });

    it('classifies a tablet', () => {
        const model = createModel(UAS.tablet);
        expect([model.isDesktop, model.isPhone, model.isTablet]).toEqual([false, false, true]);
    });
});
