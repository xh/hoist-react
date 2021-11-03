import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {checkMinVersion} from '@xh/hoist/utils/js';
import {forOwn} from 'lodash';

const {STRING} = FieldType;

/**
 * Model/tab to list server-side environment variables and JVM system properties, as loaded from
 * a dedicated admin-only endpoint.
 */
export class ServerEnvModel extends HoistModel {

    /** @member {GridModel} */
    @managed gridModel;

    get hasMinHoistCoreVersion() {
        return checkMinVersion(XH.environmentService.get('hoistCoreVersion'), '10.1');
    }

    constructor() {
        super();

        this.gridModel = new GridModel({
            groupBy: 'type',
            sortBy: 'name',
            enableExport: true,
            store: {idSpec: XH.genId},
            columns: [
                {
                    field: {name: 'type', type: STRING},
                    hidden: true
                },
                {
                    field: {name: 'name', type: STRING},
                    width: 300,
                    cellClass: 'xh-font-family-mono'
                },
                {
                    field: {name: 'value', type: STRING},
                    flex: 1,
                    cellClass: 'xh-font-family-mono',
                    autoHeight: true
                }
            ]
        });
    }

    async doLoadAsync(loadSpec) {
        if (!this.hasMinHoistCoreVersion) return;

        const resp = await XH.fetchJson({url: 'envAdmin'}),
            data = [];

        forOwn(resp.environment, (value, name) => {
            data.push({type: 'Environment Variables', value, name});
        });

        forOwn(resp.properties, (value, name) => {
            data.push({type: 'System Properties', value, name});
        });

        this.gridModel.loadData(data);
    }
}
