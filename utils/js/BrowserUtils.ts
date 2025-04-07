/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {pick} from 'lodash';

/**
 * Extract information (if available) about the client browser's window, screen, and network speed.
 */
export function getClientDeviceInfo(): ClientDeviceInfo {
    const ret: ClientDeviceInfo = {
        window: pick(window, [
            'devicePixelRatio',
            'screenX',
            'screenY',
            'innerWidth',
            'innerHeight',
            'outerWidth',
            'outerHeight'
        ])
    };

    const screen = window.screen as any;
    if (screen) {
        ret.screen = pick(screen, [
            'availWidth',
            'availHeight',
            'width',
            'height',
            'colorDepth',
            'pixelDepth',
            'availLeft',
            'availTop'
        ]);
        if (screen.orientation) {
            ret.screen.orientation = pick(screen.orientation, ['angle', 'type']);
        }
    }

    const nav = window.navigator as any;
    if (nav.connection) {
        ret.connection = pick(nav.connection, ['downlink', 'effectiveType', 'rtt']);
    }

    const perf = window.performance as any;
    if (perf?.memory) {
        ret.memory = pick(perf.memory, ['jsHeapSizeLimit', 'totalJSHeapSize', 'usedJSHeapSize']);
    }

    return ret;
}

export interface ClientDeviceInfo {
    window: {
        devicePixelRatio: number;
        screenX: number;
        screenY: number;
        innerWidth: number;
        innerHeight: number;
        outerWidth: number;
        outerHeight: number;
    };
    screen?: {
        availWidth: number;
        availHeight: number;
        width: number;
        height: number;
        colorDepth: number;
        pixelDepth: number;
        availLeft: number;
        availTop: number;
        orientation?: {
            angle: number;
            type: string;
        };
    };
    connection?: {
        downlink: number;
        effectiveType: string;
        rtt: number;
    };
    memory?: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
    };
}
