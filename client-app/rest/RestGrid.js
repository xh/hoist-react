/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory} from 'hoist';
import {SelectionState} from '../utils/SelectionState';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';
import {box, vbox} from 'hoist/layout';

import {toolbar} from './RestGridToolbar';
import {restForm} from './RestForm';
import {semanticRestForm} from './SemanticRestForm';


@observer
export class RestGrid extends Component {

    useSemantic = true; // temp convenience prop to toggle between semantic ui and blueprint

    @observable rows = null;
    @observable _rec = null;
    @observable selectionState = new SelectionState();

    render() {
        const toolbarProps = this.createToolbarProps(),
            formProps = this.createFormProps();

        return vbox({
            flex: 1,
            items: [
                toolbar(toolbarProps),
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
                        this.useSemantic ? semanticRestForm(formProps) : restForm(formProps)
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
        const idx = this.rows.findIndex(it => it.id === resp.id);
        if (method === 'POST') {
            this.rows.push(resp);
        }
        if (method === 'PUT') {
            this.rows[idx] = resp;
        }
        if (method === 'DELETE') {
            this.rows.splice(idx, 1);
        }
    }
}

export const restGrid = elemFactory(RestGrid);