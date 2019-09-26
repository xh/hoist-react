/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, creates} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {textInput, dateInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {button, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';

import {ClientErrorModel} from './ClientErrorModel';
import {clientErrorDetail} from './ClientErrorDetail';

export const ClientErrorPanel = hoistCmp({
    model: creates(ClientErrorModel),

    render({model}) {
        return panel({
            mask: 'onLoad',
            tbar: tbar(),
            items: [
                grid({
                    onRowDoubleClicked: (e) => model.openDetail(e.data)
                }),
                clientErrorDetail()
            ]
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
            exportButton()
        );
    }
);

const dateProps = {
    popoverPosition: 'bottom',
    valueType: 'localDate',
    width: 120
};

const textProps = {
    width: 150,
    enableClear: true
};