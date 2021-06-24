/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {filler, frame, div} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './CustomFilterTab.scss';
import {CustomFilterTabModel} from './CustomFilterTabModel';
import {customFilterRow} from './CustomFilterRow';

export const customFilterTab = hoistCmp.factory({
    model: uses(CustomFilterTabModel),
    render({model}) {
        return panel({
            className: 'xh-custom-filter-tab',
            tbar: tbar(),
            items: [
                frame(
                    div({
                        className: 'xh-custom-filter-tab__list',
                        items: model.rowModels.map(it => {
                            return customFilterRow({model: it, key: it.xhId});
                        })
                    })
                ),
                implicitOrMessage()
            ]
        });
    }
});

const tbar = hoistCmp.factory(
    ({model}) => {
        return toolbar({
            compact: true,
            items: [
                buttonGroupInput({
                    bind: 'op',
                    items: [
                        button({value: 'AND', text: 'AND'}),
                        button({value: 'OR', text: 'OR'})
                    ]
                }),
                filler(),
                button({
                    icon: Icon.add(),
                    text: 'Add',
                    intent: 'success',
                    title: 'Add condition',
                    onClick: () => model.addEmptyRow()
                })
            ]
        });
    }
);

const implicitOrMessage = hoistCmp.factory(
    ({model}) => {
        return div({
            omit: !model.hasImplicitOr,
            className: 'xh-custom-filter-tab__implicit_or_message',
            items: [
                Icon.info(),
                div('Multiple `=` and `like` filters will be joined using OR')
            ]
        });
    }
);