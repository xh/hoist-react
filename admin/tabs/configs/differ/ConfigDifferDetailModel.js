/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, setter} from 'hoist/mobx';
import {keys, toString} from 'lodash';
import {table, tbody, tr, th, td} from 'hoist/layout';

export class ConfigDifferDetailModel  {

    parent = null;

    @setter @observable isOpen = false;
    @setter record = null;


    constructor({parent}) {
        this.parent = parent;
    }

    showDetail(rec) {
        this.setRecord(rec);
        this.setIsOpen(true);
    }

    renderDiffTable() {
        const rec = this.record;
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

    createDiffClass(prop, local, remote) {
        if (!remote) return;
        if (!local || local[prop] !== remote[prop]) return 'diff';
    }

}