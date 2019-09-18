/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {throttle} from 'lodash';


@HoistModel
export class DraggerAnimatedModel {

    model;
    resizeState = null;
    startSize = null;

    constructor(model) {
        this.model = model;
        this.throttledSetSize = throttle(size => model.setSize(size), 50);
    }

    onDragStart = (e) => {
        this.resizeState = {startX: e.clientX, startY: e.clientY};
        this.startSize = this.model.size;
        this.model.setIsResizing(true);
        e.stopPropagation();
    }

    onDrag = (e) => {
        if (!this.resizeState) return;
        if (!e.buttons || e.buttons.length == 0) {
            this.onDragEnd();
            return;
        }

        const {side} = this.model,
            {screenX, screenY, clientX, clientY} = e,
            {startX, startY} = this.resizeState;

        // Skip degenerate final drag event from dropping over non-target
        if (screenX == 0 && screenY === 0 && clientX === 0 && clientY === 0) {
            return;
        }

        let diff;
        switch (side) {
            case 'left':    diff = clientX - startX; break;
            case 'right':   diff = startX - clientX; break;
            case 'bottom':  diff = startY - clientY; break;
            case 'top':     diff = clientY - startY; break;
        }

        if (this.startSize !== null) {
            this.throttledSetSize(this.startSize + diff);
        }
    }

    onDragEnd = () => {
        this.resizeState = null;
        this.startSize = null;
        this.model.setIsResizing(false);
    }
}