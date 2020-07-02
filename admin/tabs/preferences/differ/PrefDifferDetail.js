/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {filler, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {keys, toString} from 'lodash';
import {PrefDifferDetailModel} from './PrefDifferDetailModel';
import './Differ.scss';

export const prefDifferDetail = hoistCmp.factory({
    model: uses(PrefDifferDetailModel),

    render({model}) {
        if (!model.record) return null;

        return dialog({
            title: 'Detail',
            isOpen: model.record,
            onClose: () => model.close(),
            item: panel({
                item: diffTable(),
                bbar: [
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: () => model.close()
                    }),
                    button({
                        text: 'Accept Remote',
                        icon: Icon.cloudDownload(),
                        intent: 'primary',
                        onClick: () => model.confirmApplyRemote()
                    })
                ]
            })
        });
    }
});

const diffTable = hoistCmp.factory(
    ({model}) => {
        const {data} = model.record,
            local = data.localValue,
            remote = data.remoteValue,
            fields = keys(local || remote);

        const rows = fields.map(field => {
            const cls = model.createDiffClass(field, local, remote),
                localCell = local ? toString(local[field]) : '',
                remoteCell = remote ? {className: cls, item: toString(remote[field])} : '';
            return tr(td(field), td(localCell), td(remoteCell));
        });

        return table({
            className: 'pref-diff-table',
            item: tbody(
                tr(
                    th('Property'),
                    th('Local'),
                    th('Remote')
                ),
                ...rows
            )
        });
    }
);
