/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {clock} from '@xh/hoist/cmp/clock';
import {grid} from '@xh/hoist/cmp/grid';
import {code, div, fragment, hspacer, label, filler} from '@xh/hoist/cmp/layout';
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
            flex: 1,
            rightElement: fragment(
                button({
                    text: 'Cc',
                    onClick: () => (model.caseSensitive = !model.caseSensitive),
                    className: model.caseSensitive
                        ? 'xh-log-display__filter-button xh-log-display__filter-button--active'
                        : 'xh-log-display__filter-button xh-log-display__filter-button--inactive',
                    tooltip: 'Case-sensitive filter option'
                }),
                button({
                    text: '.*',
                    onClick: () => (model.regexOption = !model.regexOption),
                    className: model.regexOption
                        ? 'xh-log-display__filter-button xh-log-display__filter-button--active'
                        : 'xh-log-display__filter-button xh-log-display__filter-button--inactive',
                    tooltip: 'Regex filter option'
                })
            )
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

const bbar = hoistCmp.factory<LogDisplayModel>({
    render({model}) {
        const zone = XH.getEnv('serverTimeZone'),
            offset = XH.getEnv('serverTimeZoneOffset'),
            {logRootPath} = model;

        return toolbar(
            div('Server time: '),
            clock({
                timezone: zone,
                format: 'HH:mm',
                suffix: fmtTimeZone(zone, offset)
            }),
            filler(),
            div({
                omit: !logRootPath,
                items: ['Log Location: ', code(logRootPath)]
            })
        );
    }
});
