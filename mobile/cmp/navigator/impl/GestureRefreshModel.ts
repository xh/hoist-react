/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, lookup, XH} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {consumeEvent} from '@xh/hoist/utils/js';
import {isFinite, clamp} from 'lodash';
import {NavigatorModel} from '../NavigatorModel';
import {hasDraggableParent} from './Utils';

/**
 * @internal
 */
export class GestureRefreshModel extends HoistModel {
    @lookup(NavigatorModel) navigatorModel;

    @observable refreshProgress = null;

    @computed
    get refreshStarted() {
        return isFinite(this.refreshProgress);
    }

    @computed
    get refreshCompleted() {
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

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    onDragStart = e => {
        const {navigatorModel} = this,
            {direction} = e.gesture;

        this.refreshEnd();
        if (
            direction === 'down' &&
            navigatorModel.pullDownToRefresh &&
            !hasDraggableParent(e, 'down')
        ) {
            this.refreshStart();
            consumeEvent(e);
            return;
        }
    };

    @action
    onDrag = e => {
        const {direction, deltaY} = e.gesture;
        if (this.refreshStarted) {
            if (direction !== 'down') {
                this.refreshEnd();
                return;
            }
            this.refreshProgress = clamp(deltaY / 150, 0, 1);
            consumeEvent(e);
            return;
        }
    };

    @action
    onDragEnd = e => {
        if (this.refreshStarted) {
            if (this.refreshCompleted) XH.refreshAppAsync();
            this.refreshEnd();
            consumeEvent(e);
        }
    };
}
