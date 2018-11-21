/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {select} from '@xh/hoist/mobile/cmp/form'
import {MenuModel} from '@xh/hoist/mobile/cmp/menu';

/**
 * An top-level application drop down menu, which installs a standard set of menu items for common
 * application actions. Application specific items can be displayed before these standard items.
 *
 * The standard items which are visible will be based on user roles and application configuration,
 * or they can each be explicitly hidden.
 */

export class DimChooserModel extends MenuModel {

    /**
     * @param {Object} c - AppMenuModel configuration.
     * @param {Object[]} c.itemModels - See MenuModel.
     */
    constructor(
        {
            itemModels = [],
            xPos = 10,
            yPos = 300
        } = {}) {
        const selectEditors  = [
            {
                element: select({
                    width: '90%',
                    options: [
                        {value: 'A', label: 'G'},
                        {value: 'C', label: 'DA'}
                    ]
                    // options: ['A', 'B', 'C', 'D', 'E']
                })
            }
        ];
        itemModels.push(...selectEditors);
        super({itemModels, xPos, yPos});
    }

}