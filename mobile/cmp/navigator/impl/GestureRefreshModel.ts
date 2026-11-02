/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, lookup, XH} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {clamp, isFinite} from 'lodash';
import {TouchEvent} from 'react';
import {NavigatorModel} from '../NavigatorModel';
import {hasDraggableParent} from './Utils';

/**
 * Tracks a pull-down gesture over the Navigator and triggers an app refresh when it is pulled far
 * enough. The component feeds it touch events.
 *
 * @internal
 */
export class GestureRefreshModel extends HoistModel {
    @lookup(NavigatorModel) navigatorModel;

    /** Progress of the current pull from 0 to 1, or null when no pull is underway. (observable) */
    @observable accessor refreshProgress: number = null;

    @computed
    get refreshStarted(): boolean {
        return isFinite(this.refreshProgress);
    }

    @computed
    get refreshCompleted(): boolean {
        return this.refreshProgress === 1;
    }

    @action
    refreshStart() {
        this.refreshProgress = 0;
    }

    @action
    refreshEnd() {
        this.refreshProgress = null;
    }

    //------------------
    // Touch handling
    //------------------
    onTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        const {clientX, clientY} = e.touches[0];
        this.startX = clientX;
        this.startY = clientY;
        this.dragging = false;
        this.refreshEnd();
    };

    onTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 1 || this.startX == null) return;
        const {clientX, clientY} = e.touches[0],
            deltaX = clientX - this.startX,
            deltaY = clientY - this.startY,
            direction = getDirection(deltaX, deltaY);

        if (!this.dragging) {
            if (Math.hypot(deltaX, deltaY) < DRAG_MIN_DISTANCE) return;
            this.dragging = true;
            this.onDragStart(e, direction);
        }
        this.onDrag(direction, deltaY);
    };

    onTouchEnd = () => {
        if (this.dragging) this.onDragEnd();
        this.dragging = false;
        this.startX = this.startY = null;
    };

    //------------------
    // Implementation
    //------------------
    private startX: number = null;
    private startY: number = null;
    private dragging = false;

    @action
    private onDragStart(e: TouchEvent, direction: DragDirection) {
        // Only a pull down, and only where nothing closer to the touch would scroll instead.
        if (
            direction === 'down' &&
            this.navigatorModel.pullDownToRefresh &&
            !hasDraggableParent(e.nativeEvent, 'down')
        ) {
            this.refreshStart();
        }
    }

    @action
    private onDrag(direction: DragDirection, deltaY: number) {
        if (!this.refreshStarted) return;
        if (direction !== 'down') {
            this.refreshEnd();
            return;
        }
        this.refreshProgress = clamp(deltaY / REFRESH_DISTANCE, 0, 1);
    }

    @action
    private onDragEnd() {
        if (!this.refreshStarted) return;
        if (this.refreshCompleted) XH.refreshAppAsync();
        this.refreshEnd();
    }
}

type DragDirection = 'up' | 'right' | 'down' | 'left';

/** Distance in px a touch must travel before it counts as a drag rather than a tap. */
const DRAG_MIN_DISTANCE = 10;

/** Distance in px a pull down must travel to trigger a refresh. */
const REFRESH_DISTANCE = 150;

/** The dominant direction of a movement from where a touch started. */
function getDirection(deltaX: number, deltaY: number): DragDirection {
    return Math.abs(deltaX) >= Math.abs(deltaY)
        ? deltaX > 0
            ? 'right'
            : 'left'
        : deltaY > 0
          ? 'down'
          : 'up';
}
