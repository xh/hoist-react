import {Component} from 'react';
import {XH, elemFactory} from 'hoist';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';
import {box} from 'hoist/layout';

import {restForm} from 'hoist/rest/RestForm';


@observer
export class RestGrid extends Component {

    @observable rows = null;
    @observable _rec = null;

    render() {
        const formProps = {
            rec: this._rec,
            editors: this.props.editors,
            url: this.url
        };

        return box({
            flex: 1,
            items: [
                gridPanel({
                    rows: toJS(this.rows),
                    columns: this.props.columns,
                    gridOptions: {
                        onRowDoubleClicked: this.onRowDoubleClicked
                    }
                }),
                restForm(formProps)
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

    @action
    completeLoad = (success, vals) => {
        this.rows = success ? vals : [];
    }

    @action
    onRowDoubleClicked = (e) => {
        this._rec = e.data;
    }
}

export const restGrid = elemFactory(RestGrid);