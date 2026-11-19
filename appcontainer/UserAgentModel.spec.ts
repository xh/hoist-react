/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {detectDeviceType, UserAgentModel} from './UserAgentModel';

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

/**
 * Each case exercises one branch of the detection, or one edge it must get right. Expected values
 * are what ua-parser-js 2, which this detection replaced, answered for the same string: its
 * 'mobile' is phone here and its undefined is desktop.
 */
describe('detectDeviceType', () => {
    it.each([
        ['desktop', 'a Mac, when nothing matches', UAS.desktop],
        [
            'desktop',
            'a Windows touch laptop, which has a touch screen but is not a tablet',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Touch) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
        ],
        [
            'desktop',
            'jsdom, which the unit tests themselves run under',
            'Mozilla/5.0 (linux) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/30.1.3'
        ],
        ['phone', 'an iPhone', UAS.phone],
        [
            'phone',
            'an Android phone, which Chrome marks with Mobile',
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
        ],
        [
            'phone',
            'Firefox on an Android phone, which puts Mobile before the version rather than after',
            'Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0'
        ],
        ['tablet', 'an iPad', UAS.tablet],
        [
            'tablet',
            'an Android tablet, which differs from a phone only by the missing Mobile',
            'Mozilla/5.0 (Linux; Android 14; SM-X916B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
        ],
        [
            'tablet',
            'a Kindle Fire, which says neither Mobile nor Tablet',
            'Mozilla/5.0 (Linux; Android 9; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/118.3.1 like Chrome/118.0.5993.80 Safari/537.36'
        ]
    ])('is %s for %s', (expected, _, userAgent) => {
        expect(detectDeviceType({userAgent})).toBe(expected);
    });

    it('is tablet for an iPad in desktop mode, which reports as a Mac with a touch screen', () => {
        const userAgent = UAS.desktop;
        expect(detectDeviceType({userAgent, standalone: false, maxTouchPoints: 5})).toBe('tablet');
        expect(detectDeviceType({userAgent, maxTouchPoints: 5})).toBe('desktop');
        expect(detectDeviceType({userAgent, standalone: false, maxTouchPoints: 0})).toBe('desktop');
    });

    it('is phone on the Chromium userAgentData hint alone, when the string says nothing', () => {
        expect(detectDeviceType({userAgent: '', userAgentData: {mobile: true}} as any)).toBe(
            'phone'
        );
    });
});
