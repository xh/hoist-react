/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {hoistCmp, uses} from '@xh/hoist/core';
import {div, filler, hbox, vbox} from '@xh/hoist/cmp/layout';
import {dialogPanel} from '@xh/hoist/mobile/cmp/panel';
import {grid} from '@xh/hoist/cmp/grid';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import './MultiZoneMapper.scss';
import {MultiZoneMapperModel} from './MultiZoneMapperModel';

/**
 * Todo: Document
 */
export const [MultiZoneMapper, multiZoneMapper] = hoistCmp.withFactory<MultiZoneMapperModel>({
    displayName: 'MultiZoneMapper',
    model: uses(MultiZoneMapperModel),
    className: 'xh-multi-zone-mapper',
    render({model, className}) {
        const {isOpen, showRestoreDefaults, isDirty} = model;
        return dialogPanel({
            isOpen,
            title: 'Customize Grid Fields',
            icon: Icon.gridLarge(),
            className,
            items: [zonePicker(), grid()],
            bbar: [
                button({
                    omit: !showRestoreDefaults,
                    text: 'Reset',
                    minimal: true,
                    onClick: () => model.restoreDefaultsAsync()
                }),
                filler(),
                button({
                    text: 'Cancel',
                    minimal: true,
                    onClick: () => model.close()
                }),
                button({
                    text: 'Save',
                    icon: Icon.check(),
                    disabled: !isDirty,
                    onClick: () => {
                        model.commit();
                        model.close();
                    }
                })
            ]
        });
    }
});

const zonePicker = hoistCmp.factory<MultiZoneMapperModel>({
    render({model}) {
        const {leftFlex, rightFlex} = model,
            className = 'xh-multi-zone-mapper__zone-picker';

        // Todo: Display sample / placeholder values in each zone.
        return vbox({
            className,
            items: [
                hbox({
                    className: `${className}__top`,
                    items: [
                        zoneCell({zone: 'tl', flex: leftFlex}),
                        zoneCell({zone: 'tr', flex: rightFlex})
                    ]
                }),
                hbox({
                    className: `${className}__bottom`,
                    items: [
                        zoneCell({zone: 'bl', flex: leftFlex}),
                        zoneCell({zone: 'br', flex: rightFlex})
                    ]
                })
            ]
        });
    }
});

const zoneCell = hoistCmp.factory<MultiZoneMapperModel>({
    render({model, zone, flex}) {
        const {selectedZone} = model,
            className = 'xh-multi-zone-mapper__zone-picker__zone-cell';

        return div({
            className: classNames(
                className,
                zone,
                selectedZone === zone ? `${className}--selected` : null
            ),
            style: {flex},
            onClick: () => (model.selectedZone = zone),
            items: []
        });
    }
});
