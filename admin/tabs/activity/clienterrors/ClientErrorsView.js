/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {dateInput} from '@xh/hoist/desktop/cmp/input';
import {filterChooser} from '@xh/hoist/desktop/cmp/filter';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {clientErrorDetail} from './ClientErrorDetail';
import {ClientErrorsModel} from './ClientErrorsModel';

export const clientErrorsView = hoistCmp.factory({
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
    ({model}) => {
        return toolbar(
            button({
                icon: Icon.angleLeft(),
                onClick: () => model.adjustDates('subtract')
            }),
            dateInput({bind: 'startDate', ...dateInputProps}),
            Icon.caretRight(),
            dateInput({bind: 'endDate', ...dateInputProps}),
            button({
                icon: Icon.angleRight(),
                onClick: () => model.adjustDates('add'),
                disabled: model.endDate >= LocalDate.tomorrow()
            }),
            filterChooser({
                leftIcon: Icon.search(),
                flex: 1,
                placeholder: 'Search...',
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