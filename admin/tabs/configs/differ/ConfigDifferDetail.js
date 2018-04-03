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
import {filler} from 'hoist/layout';
import {toolbar} from 'hoist/cmp';
import {table, tbody, tr, th, td} from 'hoist/layout';

import {Icon} from 'hoist/icon';

import './Differ.scss';

@hoistComponent()
export class ConfigDifferDetail extends Component {

    render() {
        return dialog({
            title: 'Detail',
            isOpen: this.model.isOpen,
            onClose: this.onCloseClick,
            items: [
                this.renderDiffTable(),
                toolbar(
                    filler(),
                    button({
                        text: 'Close',
                        icon: Icon.close(),
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

    // move to model
    renderDiffTable() {
        const rec = this.model.record;
        if (!rec) return;

        const local = rec.localValue,
            remote = rec.remoteValue,
            props = keys(local || remote),
            cell = (v, cls) => td({cls: cls, item: v});

        let rows = [];

        props.forEach(prop => {
            const cls = this.createDiffClass(prop, local, remote),
                propCell = cell(prop),
                localCell = local ? cell(toString(local[prop])) : cell(''),
                remoteCell = remote ? cell(toString(remote[prop]), cls) : cell('');
            rows.push(tr(propCell, localCell, remoteCell));
        });

        return table({
            cls: 'config-diff-table',
            item: tbody({
                items: [
                    tr(
                        th('Property'),
                        th('Local'),
                        th('Remote')
                    ),
                    ...rows
                ]
            })
        });
    }

    // move to model
    createDiffClass(prop, local, remote) {
        if (!remote) return;
        if (!local || local[prop] !== remote[prop]) return 'diff';
    }
    
    onAcceptRemoteClick = () => {
        const model = this.model,
            differModel = model.parent;

        differModel.confirmApplyRemote(model.record);
    }

    onCloseClick = () => {
        this.model.setIsOpen(false);
    }
}

export const configDifferDetail= elemFactory(ConfigDifferDetail);