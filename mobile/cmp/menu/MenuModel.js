/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {isPlainObject} from 'lodash';

import {MenuItemModel} from './MenuItemModel';

@HoistModel()
/** Model for a floating drop down, managing its open/close state and items. */
export class MenuModel {

    @observable isOpen = false;
    @observable xPos = 0;
    @observable yPos = 0;
    @observable.ref itemModels = false;

    /**
     * @param {Object} c - MenuModel configuration.
     * @param {(MenuItemModel[]|Object[])} c.itemModels - MenuItemModel instances or configs.
     * @param {number} [c.xPos] - Screen X position to display the menu. Can be set via openAt().
     * @param {number} [c.yPos] - Screen Y position to display the menu. Can be set via openAt().
     */
    constructor({itemModels = [], xPos = 0, yPos = 0}) {
        this.itemModels = itemModels.map(i => isPlainObject(i) ? new MenuItemModel(i) : i);
        this.xPos = xPos;
        this.yPos = yPos;
    }

    @action
    openAt(xPos, yPos) {
        this.xPos = xPos;
        this.yPos = yPos;
        this.isOpen = true;
    }

    @action
    open() {
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

}