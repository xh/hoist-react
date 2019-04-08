import {HoistModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';

@HoistModel
export class AgGridWrapperModel {
    @bindable isReady = false;

    /** @member {GridApi} */
    agApi = null;

    /** @member {ColumnApi} */
    agColumnApi = null;

    onGridReady = ({api, columnApi}) => {
        this.agApi = api;
        this.agColumnApi = columnApi;
        this.setIsReady(true);
    }

    readExpandState() {

    }

    writeExpandState() {

    }

    readFilterState() {

    }
}