import {Component} from 'react';
import {XH, elemFactory} from 'hoist';
import {boolCheckCol} from 'hoist/columns/Core';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';


@observer
export class RestGrid extends Component {

    @observable rows = null;

    render() {
        return gridPanel({
            rows: toJS(this.rows),
            columns: this.props.columns
        });
    }

    loadAsync() {
        return XH
            .fetchJson({url: this.props.url})
            .then(rows => {
                console.log(this.props.url, rows);
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
}
export const restGrid = elemFactory(RestGrid);