/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
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
                        intent: 'danger'
                    }),
                    button({
                        text: 'Accept Remote',
                        icon: Icon.check(),
                        intent: 'success'
                    })
                )
            ]
        });
    }

    // model
    renderDiffTable() {
        const rec = this.model.record;
        if (!rec) return;

        const local = rec.localValue,
            remote = rec.remoteValue,
            props = keys(local || remote),
            row = (c1, c2, c3) => tr(c1, c2, c3),
            header = (v) => th(v),
            cell = (v, cls) => td({cls: cls, item: v}); // items?

        let rows = [];

        props.forEach(prop => {
            const cls = this.createDiffClass(prop, local, remote),
                c1 = cell(prop),
                c2 = local ? cell(toString(local[prop])) : cell(''),
                c3 = remote ? cell(toString(remote[prop]), cls) : cell('');
            rows.push(row(c1, c2, c3));
        });

        return table({
            cls: 'config-diff-table',
            item: tbody({
                items: [
                    tr(
                        header('Property'),
                        header('Local'),
                        header('Remote')
                    ),
                    ...rows
                ]
            })
        });
    }

    // model
    createDiffClass(prop, local, remote) {
        if (!remote) return;
        if (!local || local[prop] !== remote[prop]) return 'diff';
    }

    onCloseClick = () => {
        this.model.setIsOpen(false);
    }
}

export const configDifferDetail= elemFactory(ConfigDifferDetail);