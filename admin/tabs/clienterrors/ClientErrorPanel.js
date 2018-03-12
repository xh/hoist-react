/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {grid, GridModel} from 'hoist/grid';
import {UrlStore} from 'hoist/data';
import {filler, hbox, hspacer, vframe} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {textField, dayField, label} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {ClientErrorModel} from './ClientErrorModel';

@hoistComponent()
export class ClientErrorPanel extends Component {

    clientErrorModel = new ClientErrorModel();

    render() {
        return vframe(
            this.renderToolbar(),
            grid({model: this.clientErrorModel.gridModel})
        );
    }

    renderToolbar() {
        return hbox({
            cls: 'xh-tbar',
            flex: 'none',
            padding: 3,
            alignItems: 'center',
            items: [
                // hspacer(4),
                // this.dayField({field: 'startDate'}),
                // hspacer(8),
                // Icon.angleRight(),
                // hspacer(8),
                // this.dayField({field: 'endDate'}),
                // hspacer(8),
                // button({icon: Icon.caretLeft(), onClick: this.onDateGoBackClick}),
                // button({icon: Icon.caretRight(), onClick: this.onDateGoForwardClick}),
                // button({icon: Icon.arrowToRight(), onClick: this.onGoToCurrentDateClick}),
                // hspacer(8),
                // '|',
                // hspacer(8),
                // this.textField({field: 'username', placeholder: 'User...'}),
                // hspacer(10),
                // this.textField({field: 'msg', placeholder: 'Msg...'}),
                // hspacer(8),
                // '|',
                // hspacer(8),
                // button({icon: Icon.sync(), onClick: this.onSubmitClick}),
                filler(),
                this.renderErrorCount(),
                hspacer(8),
                button({icon: Icon.download(), onClick: this.onExportClick})
            ]
        });
    }

    renderErrorCount() {
        const store = this.clientErrorModel.store;
        return label(store.count + ' client errors');
    }

    onExportClick = () => {
        this.clientErrorModel.exportGrid();
    }

    async loadAsync() {
        return this.clientErrorModel.loadAsync();
    }
}
