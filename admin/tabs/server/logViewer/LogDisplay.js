/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {clock} from '@xh/hoist/cmp/clock';
import {strong, label} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {numberInput, switchInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {loadingIndicator} from '@xh/hoist/desktop/cmp/loadingindicator';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtTimeZone} from '@xh/hoist/utils/impl';
import './LogViewer.scss';
import {LogDisplayModel} from './LogDisplayModel';

/**
 * @private
 */
export const logDisplay = hoistCmp.factory({
    model: uses(LogDisplayModel),

    /** @param {LogDisplayModel} model */
    render({model}) {

        return panel({
            className: 'xh-log-display',
            tbar: tbar(),
            item: grid(),
            loadingIndicator: loadingIndicator({
                bind: model.loadModel,
                message: 'Loading...',
                spinner: false
            }),
            bbar: bbar()
        });
    }
});

const tbar = hoistCmp.factory(
    ({model}) => {
        return toolbar(
            label('Start line:'),
            numberInput({
                bind: 'startLine',
                min: 1,
                width: 80,
                disabled: model.tail,
                displayWithCommas: true
            }),
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
                placeholder: 'Search...',
                enableClear: true,
                width: 150
            }),
            '-',
            switchInput({
                bind: 'tail',
                label: 'Tail mode',
                labelSide: 'left'
            })
        );
    }
);

const bbar = hoistCmp.factory(
    () => {
        const zone = XH.getEnv('serverTimeZone'),
            offset = XH.getEnv('serverTimeZoneOffset');

        return toolbar({
            items: [
                'Server Time:',
                strong(clock({timezone: zone, format: 'HH:mm:ss'})),
                label(' ['),
                fmtTimeZone(zone, offset),
                ']'
            ],
            omit: !zone  // zone env support requires hoist-core 7.1+
        });
    }
);