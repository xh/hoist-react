/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {keys, toString} from 'lodash';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/kit/blueprint';
import {filler, table, tbody, tr, th, td} from '@xh/hoist/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './Differ.scss';

/**
 * @private
 */
@HoistComponent()
export class ConfigDifferDetail extends Component {

    render() {
        const {model} = this;
        if (!model.record) return null;

        return dialog({
            title: 'Detail',
            isOpen: model.record,
            onClose: this.onCloseClick,
            item: panel({
                item: this.renderDiffTable(),
                bbar: toolbar(
                    filler(),
                    button({
                        text: 'Close',
                        onClick: this.onCloseClick
                    }),
                    button({
                        text: 'Accept Remote',
                        icon: Icon.check(),
                        intent: 'success',
                        onClick: this.onAcceptRemoteClick
                    })
                )
            })
        });
    }

    renderDiffTable() {
        const rec = this.model.record,
            local = rec.localValue,
            remote = rec.remoteValue,
            fields = keys(local || remote);

        const rows = fields.map(field => {
            const cls = this.model.createDiffClass(field, local, remote),
                localCell = local ? toString(local[field]) : '',
                remoteCell = remote ? {cls: cls, item: toString(remote[field])} : '';
            return tr(td(field), td(localCell), td(remoteCell));
        });

        return table({
            cls: 'config-diff-table',
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
    
    onAcceptRemoteClick = () => {
        this.model.confirmApplyRemote();
    }

    onCloseClick = () => {
        this.model.close();
    }
}
export const configDifferDetail= elemFactory(ConfigDifferDetail);