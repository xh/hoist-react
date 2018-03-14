/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {grid} from 'hoist/grid';
import {vframe, filler, hspacer} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {textField, dayField, label, toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class ActivityGrid extends Component {

    render() {
        return vframe(
            this.renderToolbar(),
            grid({model: this.model.gridModel})
        );
    }

    renderToolbar() {
        return toolbar({
            items: [
                this.dayField({field: 'startDate'}),
                Icon.angleRight(),
                this.dayField({field: 'endDate'}),
                button({icon: Icon.caretLeft(), onClick: this.onDateGoBackClick}),
                button({icon: Icon.caretRight(), onClick: this.onDateGoForwardClick}),
                button({icon: Icon.arrowToRight(), onClick: this.onGoToCurrentDateClick}),
                // '|',  // TODO - tbar separator?
                hspacer(8),
                this.textField({field: 'username', placeholder: 'User...'}),
                this.textField({field: 'msg', placeholder: 'Msg...'}),
                this.textField({field: 'category', placeholder: 'Category...'}),
                this.textField({field: 'device', placeholder: 'Device...'}),
                this.textField({field: 'browser', placeholder: 'Browser...'}),
                button({icon: Icon.sync(), onClick: this.onSubmitClick}),
                filler(),
                this.renderLogCount(),
                hspacer(8),
                button({icon: Icon.download(), onClick: this.onExportClick})
            ]
        });
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
            width: 120,
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
        this.model.loadAsync();
    }

    onSubmitClick = () => {
        this.model.loadAsync();
    }

    onExportClick = () => {
        this.model.exportGrid();
    }

    renderLogCount() {
        const store = this.model.gridModel.store;
        return label(store.count + ' track logs');
    }

}
export const activityGrid = elemFactory(ActivityGrid);
