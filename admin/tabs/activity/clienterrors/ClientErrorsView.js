/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {dateInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {clientErrorDetail} from './ClientErrorDetail';
import {ClientErrorsModel} from './ClientErrorsModel';

export const clientErrorsView = hoistCmp.factory({
    model: creates(ClientErrorsModel),

    render({model}) {
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
        const {lookups} = model;
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
                disabled: model.endDate >= LocalDate.today()
            }),
            toolbarSep(),
            select({
                bind: 'username',
                placeholder: 'All Users',
                options: lookups.usernames,
                ...selectInputProps
            }),
            textInput({
                bind: 'error',
                placeholder: 'Search errors...',
                width: 260,
                enableClear: true
            }),
            button({
                icon: Icon.reset(),
                intent: 'danger',
                title: 'Reset query to defaults',
                onClick: () => model.resetQuery()
            }),
            filler(),
            gridCountLabel({unit: 'error'}),
            storeFilterField(),
            colChooserButton(),
            exportButton()
        );
    }
);

const dateInputProps = {popoverPosition: 'bottom', valueType: 'localDate', width: 120};
const selectInputProps = {width: 160, enableClear: true};