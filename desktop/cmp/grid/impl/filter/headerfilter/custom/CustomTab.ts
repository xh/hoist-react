/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {div, filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {customRow} from './CustomRow';

import './CustomTab.scss';
import {CustomTabModel} from './CustomTabModel';

/**
 * Tab for managing value based filters for Column.
 * @internal
 */
export const customTab = hoistCmp.factory({
    model: uses(CustomTabModel),
    render({model}) {
        return panel({
            className: 'xh-custom-filter-tab',
            tbar: tbar(),
            items: div({
                className: 'xh-custom-filter-tab__list',
                items: [
                    ...model.rowModels.map(m => customRow({model: m})),
                    div({
                        className: 'xh-custom-filter-tab__list__add-btn-row',
                        items: [
                            filler(),
                            button({
                                icon: Icon.add(),
                                text: 'Add',
                                intent: 'success',
                                title: 'Add condition',
                                onClick: () => model.addEmptyRow()
                            })
                        ]
                    })
                ]
            })
        });
    }
});

const tbar = hoistCmp.factory<CustomTabModel>(({model}) => {
    return toolbar({
        className: 'xh-custom-filter-tab__tbar',
        omit: model.rowModels.length < 2,
        compact: true,
        items: [
            filler(),
            buttonGroupInput({
                bind: 'op',
                outlined: true,
                items: [button({value: 'AND', text: 'AND'}), button({value: 'OR', text: 'OR'})]
            }),
            filler()
        ]
    });
});
