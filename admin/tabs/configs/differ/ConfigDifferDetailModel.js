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

    @setter @observable record = null;

    constructor({parent}) {
        this.parent = parent;
    }

    showDetail(rec) {
        this.setRecord(rec);
    }

    renderDiffTable() {
        const rec = this.record,
            local = rec.localValue,
            remote = rec.remoteValue,
            props = keys(local || remote);

        let rows = [];

        props.forEach(prop => {
            const cls = this.createDiffClass(prop, local, remote),
                propCell = td(prop),
                localCell = local ? td(toString(local[prop])) : td(''),
                remoteCell = remote ? td({cls: cls, item: toString(remote[prop])}) : td('');
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

    confirmApplyRemote() {
        this.parent.confirmApplyRemote(this.record);
    }

}