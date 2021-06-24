/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {compact, isEmpty} from 'lodash';

import {customFilterTab} from './custom/CustomFilterTab';
import {CustomFilterTabModel} from './custom/CustomFilterTabModel';
import {enumFilterTab} from './enum/EnumFilterTab';
import {EnumFilterTabModel} from './enum/EnumFilterTabModel';

export class FilterPopoverModel extends HoistModel {
    gridModel;
    xhColumn;
    colId;

    @bindable isOpen = false;

    @managed tabContainerModel;
    @managed enumFilterTabModel;
    @managed customFilterTabModel;

    /**
     * @member {Object} - Filter config output by this model
     */
    @computed.struct
    get filter() {
        const filters = compact([this.enumFilterTabModel.filter, this.customFilterTabModel.filter]);
        if (isEmpty(filters)) return null;
        return filters.length > 1 ? {filters, op: 'AND'} : filters[0];
    }

    get hasFilter() {
        return !!this.filter;
    }

    get hasEnumFilter() {
        return !!this.enumFilterTabModel.filter;
    }

    get hasCustomFilter() {
        return !!this.customFilterTabModel.filter;
    }

    get enumFilterTabActive() {
        return this.tabContainerModel.activeTabId === 'enumFilter';
    }

    get store() {
        return this.gridModel.store;
    }

    get storeFilter() {
        return this.store.filter;
    }

    get type() {
        return this.store.getField(this.colId).type;
    }

    constructor({gridModel, xhColumn, agColumn}) {
        super();
        makeObservable(this);

        const {colId} = agColumn;
        this.gridModel = gridModel;
        this.xhColumn = xhColumn;
        this.colId = colId;

        this.enumFilterTabModel = new EnumFilterTabModel(this);
        this.customFilterTabModel = new CustomFilterTabModel(this);
        this.tabContainerModel = new TabContainerModel({
            switcher: false,
            tabs: [
                {
                    id: 'enumFilter',
                    title: 'Values',
                    content: enumFilterTab
                },
                {
                    id: 'customFilter',
                    title: 'Custom',
                    content: customFilterTab
                }
            ]
        });

        this.addReaction({
            track: () => this.filter,
            run: (filter) => gridModel.setColumnFilter({colId, filter})
        });
    }

    commit() {
        if (this.enumFilterTabActive) {
            this.enumFilterTabModel.commit();
        } else {
            this.customFilterTabModel.commit();
        }
        this.closeMenu();
    }

    clear() {
        this.enumFilterTabModel.clear();
        this.customFilterTabModel.clear();
        this.closeMenu();
    }

    openMenu() {
        this.setIsOpen(true);
    }

    closeMenu() {
        this.setIsOpen(false);
    }
}
