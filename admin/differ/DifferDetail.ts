/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {filler, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {fmtDateTime} from '@xh/hoist/format';
import {div} from '@xh/hoist/cmp/layout';
import {keys, toString, filter, startsWith} from 'lodash';
import {strong} from '../../cmp/layout';
import {DifferDetailModel} from './DifferDetailModel';
import {AppModel} from '@xh/hoist/admin/AppModel';
import './Differ.scss';

export const differDetail = hoistCmp.factory({
    model: uses(DifferDetailModel),

    render({model}) {
        if (!model.record) return null;

        return dialog({
            title: 'Detail',
            icon: Icon.diff(),
            isOpen: model.record,
            className: 'xh-admin-diff-detail',
            onClose: () => model.close(),
            item: panel({
                item: diffTable(),
                bbar: AppModel.readonly
                    ? []
                    : [
                          filler(),
                          button({
                              text: 'Cancel',
                              onClick: () => model.close()
                          }),
                          button({
                              text: 'Apply Remote',
                              icon: Icon.cloudDownload(),
                              intent: 'primary',
                              outlined: true,
                              onClick: () => model.confirmApplyRemote()
                          })
                      ]
            })
        });
    }
});

const diffTable = hoistCmp.factory<DifferDetailModel>(({model}) => {
    const {data} = model.record,
        local = data.localValue,
        remote = data.remoteValue,
        fields = filter(keys(local || remote), key => !startsWith(key, 'lastUpdated')),
        localLastUpdatedBy = local?.lastUpdatedBy,
        remoteLastUpdatedBy = remote?.lastUpdatedBy,
        localLastUpdated = fmtDateTime(local?.lastUpdated),
        remoteLastUpdated = fmtDateTime(remote?.lastUpdated);

    const rows = fields.map(field => {
        const cls = model.createDiffClass(field, local, remote),
            localCell = local ? toString(local[field]) : '',
            remoteCell = remote ? {className: cls, item: toString(remote[field])} : null;
        return tr(td(field), td(localCell), td(remoteCell));
    });

    return table(
        tbody(
            tr(th(''), th('Local'), th('Remote')),
            ...rows,
            tr(
                td(''),
                td(div(strong(localLastUpdatedBy)), div(localLastUpdated)),
                td(div(strong(remoteLastUpdatedBy)), div(remoteLastUpdated))
            )
        )
    );
});
