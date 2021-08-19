/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {switchInput} from '@xh/hoist/desktop/cmp/input';

/**
 * Convenience configuration for an auto refresh AppOption.
 */
export const autoRefreshAppOption = () => ({
    omit: XH.autoRefreshService.interval <= 0,
    name: 'autoRefresh',
    prefName: 'xhAutoRefreshEnabled',
    formField: {
        label: 'Auto-refresh',
        info: `Enable to auto-refresh app data every ${XH.autoRefreshService.interval} seconds`,
        item: switchInput()
    }
});