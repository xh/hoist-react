/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {clock} from '@xh/hoist/cmp/clock';
import {grid} from '@xh/hoist/cmp/grid';
import {hspacer, label} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {numberInput, switchInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {fmtTimeZone} from '@xh/hoist/utils/impl';
import {LogDisplayModel} from './LogDisplayModel';
import './LogViewer.scss';

/**
 * @internal
 */
export const logDisplay = hoistCmp.factory({
    model: uses(LogDisplayModel),

    render({model}) {
        return panel({
            className: 'xh-log-display',
            tbar: tbar(),
            item: grid(),
            loadingIndicator: 'onLoad',
            bbar: bbar()
        });
    }
});

const tbar = hoistCmp.factory<LogDisplayModel>(({model}) => {
    return toolbar(
        label('Start line:'),
        numberInput({
            bind: 'startLine',
            min: 1,
            width: 80,
            disabled: model.tail,
            displayWithCommas: true
        }),
        hspacer(5),
        label('Max lines:'),
        numberInput({
            bind: 'maxLines',
            min: 1,
            width: 80,
            displayWithCommas: true
        }),
        '-',
        textInput({
            bind: 'pattern',
            placeholder: 'Filter',
            leftIcon: Icon.filter(),
            enableClear: true,
            flex: 1
        }),
        gridFindField({flex: 1}),
        '-',
        switchInput({
            bind: 'tail',
            label: 'Tail',
            labelSide: 'left'
        }),
        hspacer(5),
        button({
            icon: Icon.pause(),
            intent: 'warning',
            outlined: true,
            text: 'Paused',
            onClick: () => {
                model.gridModel.clearSelection();
                model.scrollToTail();
            },
            omit: !model.tail || model.tailActive
        })
    );
});

const bbar = hoistCmp.factory(() => {
    const zone = XH.getEnv('serverTimeZone');

    return toolbar({
        items: [
            'Server time: ',
            clock({
                timezone: zone,
                format: 'HH:mm',
                suffix: fmtTimeZone(zone, XH.getEnv('serverTimeZoneOffset'))
            })
        ],
        omit: !zone // zone env support requires hoist-core 7.1+
    });
});
