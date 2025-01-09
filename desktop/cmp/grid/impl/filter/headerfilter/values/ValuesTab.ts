/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {div, hframe, placeholder, span, vbox, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';

import './ValuesTab.scss';
import {ValuesTabModel} from './ValuesTabModel';

/**
 * Tab for managing value based filters for Column.
 * @internal
 */
export const valuesTab = hoistCmp.factory({
    model: uses(ValuesTabModel),
    render() {
        return panel({
            className: 'xh-values-filter-tab',
            tbar: tbar(),
            item: body()
        });
    }
});

const tbar = hoistCmp.factory(() => {
    return toolbar(
        storeFilterField({
            bind: 'filterText',
            leftIcon: Icon.search(),
            placeholder: 'Search...',
            flex: 1,
            autoFocus: true,
            matchMode: 'any'
        })
    );
});

const body = hoistCmp.factory<ValuesTabModel>(({model}) => {
    const {isCustomFilter} = model.headerFilterModel;
    if (isCustomFilter) return customFilterPlaceholder();
    return vframe(storeFilterSelect(), grid(), hiddenValuesMessage());
});

const storeFilterSelect = hoistCmp.factory<ValuesTabModel>(({model}) => {
    return vbox({
        className: 'store-filter-header',
        items: [
            hframe(
                checkbox({
                    disabled: model.gridModel.store.empty,
                    displayUnsetState: true,
                    value: model.allVisibleRecsChecked,
                    onChange: () => model.toggleAllRecsChecked()
                }),
                span(`(Select All${model.filterText ? ' Search Results' : ''})`)
            ),
            hframe({
                omit: !model.filterText || model.gridModel.store.empty,
                items: [
                    checkbox({bind: 'combineCurrentFilters'}),
                    span(`Add current selection to filter`)
                ]
            })
        ]
    });
});

const customFilterPlaceholder = hoistCmp.factory<ValuesTabModel>(({model}) => {
    return placeholder(
        div({
            className: 'xh-values-filter-tab__custom-filter-message',
            items: [
                'Custom filter active',
                button({
                    icon: Icon.undo(),
                    text: 'Clear',
                    intent: 'danger',
                    onClick: () => model.headerFilterModel.clear(false)
                })
            ]
        })
    );
});

const hiddenValuesMessage = hoistCmp.factory<ValuesTabModel>(({model}) => {
    return div({
        omit: !model.hasHiddenValues,
        className: 'xh-values-filter-tab__hidden-values-message',
        items: [Icon.info(), div('Some values are hidden due to filters on other columns')]
    });
});
