/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {keys, toString} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button, dialog} from 'hoist/kit/blueprint';
import {filler, table, tbody, tr, th, td} from 'hoist/layout';
import {toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import './Differ.scss';

@hoistComponent()
export class ConfigDifferDetail extends Component {

    render() {
        const model = this.model;
        if (!model.record) return null;

        // done test and remove before merge
        return dialog({
            title: 'Detail',
            isOpen: model.record,
            onClose: this.onCloseClick,
            items: [
                this.renderDiffTable(),
                toolbar(
                    filler(),
                    button({
                        text: 'Close',
                        intent: 'danger',
                        onClick: this.onCloseClick
                    }),
                    button({
                        text: 'Accept Remote',
                        icon: Icon.check(),
                        intent: 'success',
                        onClick: this.onAcceptRemoteClick
                    })
                )
            ]
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