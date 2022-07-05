/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {filler, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {keys, toString} from 'lodash';
import {DifferDetailModel} from './DifferDetailModel';
import './Differ.scss';

export const differDetail = hoistCmp.factory({
    model: uses(DifferDetailModel),

    render({model}) {
        if (!model.record) return null;

        return dialog({
            title: 'Detail',
            isOpen: model.record,
            className: 'xh-admin-diff-detail',
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
                        minimal: false,
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

        return table(
            tbody(
                tr(
                    th(''),
                    th('Local'),
                    th('Remote')
                ),
                ...rows
            )
        );
    }
);
