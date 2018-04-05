/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {action, observable} from 'hoist/mobx';
import {keys, toString} from 'lodash';
import {table, tbody, tr, th, td} from 'hoist/layout';

export class ConfigDifferDetailModel  {

    parent = null;

    @observable record = null;

    constructor({parent}) {
        this.parent = parent;
    }

    @action
    showDetail(rec) {
        this.record = rec;
    }

    @action
    closeDetail() {
        this.record = null;
    }

    renderDiffTable() {
        const rec = this.record,
            local = rec.localValue,
            remote = rec.remoteValue,
            fields = keys(local || remote);

        const rows = fields.map(field => {
            const cls = this.createDiffClass(field, local, remote),
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

    createDiffClass(field, local, remote) {
        if (!remote) return;
        if (!local || local[field] !== remote[field]) return 'diff';
    }

    confirmApplyRemote() {
        this.parent.confirmApplyRemote(this.record);
    }

}