/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {grid} from 'hoist/grid';
import {filler, vframe} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {textField, dayField, storeCountLabel, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {ClientErrorModel} from './ClientErrorModel';

@hoistComponent()
export class ClientErrorPanel extends Component {

    localModel = new ClientErrorModel();

    render() {
        return vframe(
            this.renderToolbar(),
            grid({model: this.model.gridModel})
        );
    }

    renderToolbar() {
        return toolbar(
            this.dayField({field: 'startDate'}),
            Icon.angleRight(),
            this.dayField({field: 'endDate'}),
            button({
                icon: Icon.caretLeft(),
                onClick: this.onDateGoBackClick
            }),
            button({
                icon: Icon.caretRight(),
                onClick: this.onDateGoForwardClick,
                cls: 'xh-no-pad'
            }),
            button({
                icon: Icon.arrowToRight(),
                onClick: this.onGoToCurrentDateClick,
                cls: 'xh-no-pad'
            }),
            toolbarSep(),
            this.textField({field: 'username', placeholder: 'User...'}),
            this.textField({field: 'error', placeholder: 'Error...'}),
            button({
                icon: Icon.sync(),
                onClick: this.onSubmitClick
            }),
            filler(),
            storeCountLabel({
                store: this.model.store,
                unitConfig: {singular: 'client error', plural: 'client errors'}}),
            button({
                icon: Icon.download(),
                onClick: this.onExportClick
            })
        );
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    dayField(args) {
        return dayField({
            model: this.model,
            onCommit: this.onDateCommit,
            popoverPosition: 'bottom',
            width: 100,
            ...args
        });
    }

    textField(args) {
        return textField({
            model: this.model,
            width: 150,
            ...args
        });
    }

    onDateGoBackClick = () => {
        this.model.adjustDates('subtract');
    }

    onDateGoForwardClick = () => {
        this.model.adjustDates('add');
    }

    onGoToCurrentDateClick = () => {
        this.model.adjustDates('subtract', true);
    }

    onDateCommit = () => {
        this.loadAsync();
    }

    onSubmitClick = () => {
        this.loadAsync();
    }

    onExportClick = () => {
        this.model.exportGrid();
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}
