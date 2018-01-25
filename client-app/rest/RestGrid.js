import {Component} from 'react';
import {XH, elemFactory} from 'hoist';
import {SelectionState} from '../utils/SelectionState';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';
import {box, vbox, hbox} from 'hoist/layout';
import {button} from 'hoist/blueprint';

import {restForm} from 'hoist/rest/RestForm';


@observer
export class RestGrid extends Component {

    @observable rows = null;
    @observable _rec = null;

    @observable selectionState = new SelectionState();

    render() {
        const formProps = {
            rec: this._rec,
            editors: this.props.editors,
            url: this.props.url,
            updateRec: this.updateRows
        };

        return vbox({
            flex: 1,
            items: [
                this.renderToolbar(),
                box({
                    flex: 1,
                    items: [
                        gridPanel({
                            rows: toJS(this.rows),
                            columns: this.props.columns,
                            onGridReady: this.onGridReady,
                            selectionState: this.selectionState,
                            gridOptions: {
                                onRowDoubleClicked: this.onRowDoubleClicked
                            }
                        }),
                        restForm(formProps)
                    ]
                })
            ]
        });
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

    // factor into own component
    renderToolbar() {
        return hbox({
            // selectionState: this.selectionState, add as prop once this is a stand alone component
            style: {
                background: 'lightgray'
            },
            items: [
                button({
                    text: 'Add',
                    style: {
                        marginTop: 5,
                        marginBottom: 5,
                        marginLeft: 5
                    },
                    onClick: this.addRec
                }),
                button({
                    text: 'Delete',
                    style: {
                        marginTop: 5,
                        marginBottom: 5,
                        marginLeft: 5
                    },
                    disabled: !this.selectionState.firstRow,
                    onClick: this.deleteRec
                })
            ]
        });
    }


    deleteRec = () => {
        const selection = this.selectionState.firstRow;
        return XH.fetchJson({
            url: this.props.url,
            method: 'DELETE',
            params: {data: selection.id.toString()}
        }).then(resp => {
            // this.props.updateRows(r.data); // TODO figure out delete logic in updateRows
            this.onClose();
        }).catch((e) => {
            console.log(e);
        });
    }

    @action
    addRec = () => {
        this._rec = {};
    }
    
    @action
    completeLoad = (success, vals) => {
        this.rows = success ? vals : [];
    }

    @action
    onRowDoubleClicked = (e) => {
        this._rec = e.data;
    }

    @action
    updateRows = (rec) => {
        const idx = this.rows.findIndex(it => it.id == rec.id);
        if (idx >= 0) {
            this.rows[idx] = rec;
        } else {
            this.rows.push(rec);
        }
    }
}

export const restGrid = elemFactory(RestGrid);