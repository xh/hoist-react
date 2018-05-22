/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';

@HoistModel()
/** Model for a floating drop down, managing its open/close state and items. */
export class MenuModel {

    @observable isOpen = false;
    @observable xPos = 0;
    @observable yPos = 0;
    @observable.ref items = false;

    /**
     * Items support the following props:
     *      icon:       icon to display to left of text
     *      text:       string / Element to display.
     *      handler:    function to trigger on item tap.
     */
    constructor({items}) {
        this.items = items;
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