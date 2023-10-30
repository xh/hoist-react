/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {hoistCmp, uses} from '@xh/hoist/core';
import {div, filler, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {dialogPanel} from '@xh/hoist/mobile/cmp/panel';
import {grid} from '@xh/hoist/cmp/grid';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {intersperse} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import './MultiZoneMapper.scss';
import {MultiZoneMapperModel} from './MultiZoneMapperModel';

/**
 * Hoist UI for user selection and discovery of available MultiZoneGrid columns, enabled via the
 * `MultiZoneGridModel.multiZoneMapperModel` config option.
 *
 * This component displays an example of each of the four zones, with the available columns for
 * the currently selected zone displayed in a list below. Users can toggle column visibility
 * and labels for each zone to construct a custom layout for the grid rows.
 *
 * It is not necessary to manually create instances of this component within an application.
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
        const {selectedZone, delimiter} = model,
            className = 'xh-multi-zone-mapper__zone-picker__zone-cell',
            samples = model.getSamplesForZone(zone);

        return div({
            className: classNames(
                className,
                zone,
                selectedZone === zone ? `${className}--selected` : null
            ),
            style: {flex},
            onClick: () => (model.selectedZone = zone),
            items: intersperse(samples, span(delimiter))
        });
    }
});
