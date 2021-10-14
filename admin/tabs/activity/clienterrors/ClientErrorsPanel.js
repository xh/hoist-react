/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, buttonGroup, colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {filterChooser} from '@xh/hoist/desktop/cmp/filter';
import {dateInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {clientErrorDetail} from './ClientErrorDetail';
import {ClientErrorsModel} from './ClientErrorsModel';


export const clientErrorsPanel = hoistCmp.factory({
    model: creates(ClientErrorsModel),

    render() {
        return panel({
            className: 'xh-admin-activity-panel',
            tbar: tbar(),
            items: [
                grid(),
                clientErrorDetail()
            ],
            mask: 'onLoad'
        });
    }
});

const tbar = hoistCmp.factory(
    /** @param {ClientErrorsModel} model */
    ({model}) => {
        return toolbar(
            button({
                icon: Icon.angleLeft(),
                onClick: () => model.adjustDates('subtract')
            }),
            dateInput({bind: 'startDay', ...dateInputProps}),
            Icon.caretRight(),
            dateInput({bind: 'endDay', ...dateInputProps}),
            button({
                icon: Icon.angleRight(),
                onClick: () => model.adjustDates('add'),
                disabled: model.endDay >= LocalDate.currentAppDay()
            }),
            buttonGroup(
                button({text: '6m', outlined: true, width: 40, onClick: () => model.adjustStartDate(6, 'months')}),
                button({text: '1m', outlined: true, width: 40, onClick: () => model.adjustStartDate(1, 'months')}),
                button({text: '7d', outlined: true, width: 40, onClick: () => model.adjustStartDate(7, 'days')}),
                button({text: '1d', outlined: true, width: 40, onClick: () => model.adjustStartDate(1, 'days')})
            ),
            toolbarSep(),
            filterChooser({
                flex: 1,
                enableClear: true
            }),
            toolbarSep(),
            button({
                icon: Icon.reset(),
                intent: 'danger',
                title: 'Reset query to defaults',
                onClick: () => model.resetQuery()
            }),
            toolbarSep(),
            gridCountLabel({unit: 'error'}),
            colChooserButton(),
            exportButton()
        );
    }
);

const dateInputProps = {popoverPosition: 'bottom', valueType: 'localDate', width: 120};
