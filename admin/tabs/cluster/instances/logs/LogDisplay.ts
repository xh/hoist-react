/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {clock} from '@xh/hoist/cmp/clock';
import {grid} from '@xh/hoist/cmp/grid';
import {filler, fragment, hspacer, label, placeholder} from '@xh/hoist/cmp/layout';
import {loadingIndicator} from '@xh/hoist/cmp/loadingindicator';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button, modalToggleButton} from '@xh/hoist/desktop/cmp/button';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {numberInput, switchInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {fmtTimeZone} from '@xh/hoist/utils/impl';
import {LogDisplayModel} from './LogDisplayModel';
import './LogViewer.scss';

/**
 * @internal
 */
export const logDisplay = hoistCmp.factory({
    model: uses(LogDisplayModel),
    displayName: 'LogDisplay',
    className: 'xh-log-display',

    render({model, className}) {
        return panel({
            className,
            tbar: tbar(),
            item: model.file ? grid() : placeholder(Icon.fileText(), 'Select a log file.'),
            bbar: bbar(),
            model: model.panelModel,
            loadingIndicator: loadingIndicator({
                message: 'Loading log contents...',
                bind: model.loadModel
            })
        });
    }
});

const tbar = hoistCmp.factory<LogDisplayModel>(({model}) => {
    return toolbar(
        label('Start line:'),
        numberInput({
            bind: 'startLine',
            min: 1,
            width: 70,
            disabled: model.tail,
            displayWithCommas: true
        }),
        hspacer(5),
        label('Max lines:'),
        numberInput({
            bind: 'maxLines',
            min: 1,
            width: 70,
            displayWithCommas: true
        }),
        '-',
        textInput({
            bind: 'pattern',
            placeholder: 'Filter lines...',
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
        gridFindField({flex: 1, placeholder: 'Find lines...'}),
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
        }),
        '-',
        modalToggleButton()
    );
});

const bbar = hoistCmp.factory<LogDisplayModel>({
    render({model}) {
        const zone = XH.getEnv('serverTimeZone'),
            offset = XH.getEnv('serverTimeZoneOffset'),
            {logRootPath} = model;

        return toolbar(
            button({
                icon: Icon.gear(),
                text: 'Configure Levels',
                onClick: () => model.showLogLevelDialog()
            }),
            filler(),
            Icon.clock(),
            clock({
                timezone: zone,
                format: 'HH:mm',
                suffix: fmtTimeZone(zone, offset)
            }),
            fragment({
                omit: !logRootPath,
                items: [toolbarSep(), Icon.folder({className: 'xh-margin-right'}), logRootPath]
            })
        );
    }
});
