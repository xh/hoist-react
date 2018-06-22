/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';

/**
 * Model for a Tab
 */
@HoistModel()
export class TabModel {
    id = null;
    pageFactory = null;
    label = null;
    icon = null;
    parent = null;

    /**
     * @param {string} id - unique ID.
     * @param {function} pageFactory - element factory for page component.
     * @param {String} label - text to be displayed in the Tabbar.
     * @param {Icon} [icon] - icon to be displayed in the Tabbar.
     */
    constructor({
        id,
        pageFactory,
        label,
        icon
    }) {
        this.id = id;
        this.pageFactory = pageFactory;
        this.label = label;
        this.icon = icon;
    }
}