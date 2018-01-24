import {Component} from 'react';
import {XH, elemFactory} from 'hoist';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';
import {box, vbox, hbox} from 'hoist/layout';
import {button} from 'hoist/blueprint';

import {restForm} from 'hoist/rest/RestForm';


@observer
export class RestGrid extends Component {

    @observable rows = null;
    @observable _rec = null;
    @observable selectionModel = null;

    render() {
        const formProps = {
            rec: this._rec,
            editors: this.props.editors,
            url: this.props.url,
            updateRec: this.updateRec
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
                            gridOptions: {
                                onRowDoubleClicked: this.onRowDoubleClicked,
                                onSelectionChanged: this.onSelectionChanged
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

    renderToolbar() {
        return hbox({
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
                    disabled: !this.selectionModel,
                    onClick: this.deleteRec
                })
            ]
        });
    }


    deleteRec = () => {
        console.log(this.selectionModel[0]);
    }

    @action
    onSelectionChanged = (ev) => {
        this.selectionModel = ev.api.getSelectedRows();
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
    updateRec = (rec) => {
        const idx = this.rows.findIndex(it => it.id == rec.id);
        if (idx >= 0) {
            this.rows[idx] = rec;
        } else {
            this.rows.push(rec);
        }
    }
}

export const restGrid = elemFactory(RestGrid);