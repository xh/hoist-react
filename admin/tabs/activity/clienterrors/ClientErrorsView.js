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
import {button, colChooserButton, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
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
            className: 'xh-admin-client-errors',
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
            dateInput({bind: 'startDate', ...dateProps}),
            Icon.caretRight(),
            dateInput({bind: 'endDate', ...dateProps}),
            button({
                icon: Icon.angleRight(),
                onClick: () => model.adjustDates('add'),
                disabled: model.endDate >= LocalDate.today()
            }),
            button({
                icon: Icon.angleDoubleRight(),
                onClick: () => model.adjustDates('subtract', true)
            }),
            toolbarSep(),
            textInput({bind: 'username', placeholder: 'Username', ...textProps}),
            textInput({bind: 'error', placeholder: 'Error', ...textProps}),
            refreshButton(),
            filler(),
            gridCountLabel({unit: 'error'}),
            storeFilterField(),
            colChooserButton(),
            exportButton()
        );
    }
);

const dateProps = {popoverPosition: 'bottom', valueType: 'localDate', width: 120};
const textProps = {width: 150, enableClear: true};