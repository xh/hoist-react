/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {vframe, placeholder, div} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {grid} from '@xh/hoist/cmp/grid';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {Icon} from '@xh/hoist/icon';

import './EnumFilterTab.scss';
import {EnumFilterTabModel} from './EnumFilterTabModel';

export const enumFilterTab = hoistCmp.factory({
    model: uses(EnumFilterTabModel),
    render() {
        return panel({
            className: 'xh-enum-filter-tab',
            tbar: tbar(),
            item: body()
        });
    }
});

const tbar = hoistCmp.factory(
    () => {
        return toolbar({
            compact: true,
            item: storeFilterField({
                bind: 'filterText',
                leftIcon: Icon.search(),
                placeholder: 'Search...',
                flex: 1
            })
        });
    }
);

const body = hoistCmp.factory(
    ({model}) => {
        const {isCustomFilter} = model.parentModel;
        if (isCustomFilter) return customFilterPlaceholder();
        return vframe(
            grid(),
            hiddenValuesMessage()
        );
    }
);

const customFilterPlaceholder = hoistCmp.factory(
    ({model}) => {
        return placeholder(
            div({
                className: 'xh-enum-filter-tab__custom-filter-message',
                items: [
                    'Custom filter active',
                    button({
                        icon: Icon.undo(),
                        text: 'Clear',
                        intent: 'danger',
                        onClick: () => model.parentModel.clear(false)
                    })
                ]
            })
        );
    }
);

const hiddenValuesMessage = hoistCmp.factory(
    ({model}) => {
        return div({
            omit: !model.hasHiddenValues,
            className: 'xh-enum-filter-tab__hidden-values-message',
            items: [
                Icon.info(),
                div('Some values are hidden due to filters on other columns')
            ]
        });
    }
);