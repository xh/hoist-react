/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {filler, div} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './CustomTab.scss';
import {CustomTabModel} from './CustomTabModel';
import {customRow} from './CustomRow';

/**
 * Tab for managing value based filters for Column.
 * @private
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
                    ...model.rowModels.map(it => customRow({model: it, key: it.xhId})),
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

const tbar = hoistCmp.factory(
    ({model}) => {
        return toolbar({
            className: 'xh-custom-filter-tab__tbar',
            omit: model.rowModels.length < 2,
            compact: true,
            items: [
                filler(),
                buttonGroupInput({
                    bind: 'op',
                    outlined: true,
                    items: [
                        button({value: 'AND', text: 'AND'}),
                        button({value: 'OR', text: 'OR'})
                    ]
                }),
                filler()
            ]
        });
    }
);