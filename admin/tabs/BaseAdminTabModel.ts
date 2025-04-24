/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {createRef} from 'react';
import {isDisplayed} from '@xh/hoist/utils/js';

export class BaseAdminTabModel extends HoistModel {
    viewRef = createRef<HTMLElement>();

    get isVisible() {
        return XH.pageIsVisible && isDisplayed(this.viewRef.current);
    }
}
