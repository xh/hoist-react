/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import './styles.css';

import {Component} from 'react';
import {XH, elemFactory, elem} from 'hoist';
import {SelectionState} from 'hoist/utils/SelectionState';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';
import {box, vbox} from 'hoist/layout';

import {RestGridToolbar} from './RestGridToolbar';
import {RestFormBlueprint} from './RestFormBlueprint';
import {RestFormSemantic} from './RestFormSemantic';


@observer
export class RestGrid extends Component {

    useSemantic = true;

    @observable rows = null;
    @observable _rec = null;
    @observable selectionState = new SelectionState();

    render() {
        const toolbarProps = this.createToolbarProps(),
            formProps = this.createFormProps();

        return vbox({
            flex: 1,
            items: [
                elem(RestGridToolbar, toolbarProps),
                box({
                    flex: 1,
                    items: [
                        gridPanel({
                            rows: toJS(this.rows),
                            columns: this.props.columns,
                            onGridReady: this.onGridReady,
                            selectionState: this.selectionState,
                            gridOptions: {
                                onRowDoubleClicked: this.editRecord
                            }
                        }),
                        elem(this.useSemantic ? RestFormSemantic : RestFormBlueprint, formProps)
                    ]
                })
            ]
        });
    }

    createToolbarProps() {
        return {
            selectionState: this.selectionState,
            rec: this.rec,
            addRec: this.addRecord,
            url: this.props.url,
            updateRows: this.updateRows
        };
    }

    createFormProps() {
        return {
            rec: this._rec,
            editors: this.props.editors,
            url: this.props.url,
            updateRows: this.updateRows
        };
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

    @action
    completeLoad = (success, vals) => {
        this.rows = success ? vals : [];
    }

    @action
    addRecord = () => {
        this._rec = {};
    }

    @action
    editRecord = (e) => {
        this._rec = e.data;
    }

    @action
    updateRows = (resp, method) => {
        const rows = this.row,
            idx = rows.findIndex(it => it.id === resp.id);
        switch (method) {
            case 'POST':
                rows.push(resp);
                break;
            case 'PUT':
                rows[idx] = resp;
                break;
            case 'DELETE':
                rows.splice(idx, 1);
                break;
            default:
        }
    }
}

export const restGrid = elemFactory(RestGrid);