/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import './styles.css';

import {Component} from 'react';
import {XH, elemFactory, elem} from 'hoist';
import {SelectionModel} from 'hoist/utils/SelectionModel';
import {RestModel} from './RestModel';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, toJS} from 'hoist/mobx';
import {frame, vframe} from 'hoist/layout';
import {hoistAppModel} from 'hoist/app/HoistAppModel';

import {RestGridToolbar} from './RestGridToolbar';
import {RestFormBlueprint} from './RestFormBlueprint';
import {RestFormSemantic} from './RestFormSemantic';

@observer
export class RestGrid extends Component {

    @observable restModel = new RestModel({url: this.props.url});
    @observable selectionModel = new SelectionModel();

    render() {
        const toolbarProps = this.createToolbarProps(),
            formProps = this.createFormProps();

        return vframe(
            elem(RestGridToolbar, toolbarProps),
            frame(
                gridPanel({
                    rows: toJS(this.restModel.rows),
                    columns: this.props.columns,
                    onGridReady: this.onGridReady,
                    selectionModel: this.selectionModel,
                    gridOptions: {
                        onRowDoubleClicked: this.restModel.editRecord
                    }
                })
            ),
            elem(hoistAppModel.useSemantic ? RestFormSemantic : RestFormBlueprint, formProps)
        );
    }

    loadAsync() {
        return XH
            .fetchJson({url: this.props.url})
            .then(rows => {
                this.completeLoad(true, rows.data);
            }).catch(e => {
                this.completeLoad(false, e);
                XH.handleException(e);
            });
    }

    //-----------------
    // Implementation
    //-----------------
    completeLoad = (success, vals) => {
        this.restModel.setRows(success ? vals : []);
    }

    createToolbarProps() {
        return {
            restModel: this.restModel,
            selectionModel: this.selectionModel
        };
    }

    createFormProps() {
        const restModel = this.restModel;
        return {
            restModel: restModel,
            rec: restModel.rec, // this is key to getting mobx to rerender on change
            editors: this.props.editors
        };
    }
}

export const restGrid = elemFactory(RestGrid);