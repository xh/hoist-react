/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {hoistCmp, uses} from '@xh/hoist/core';
import {div, filler, hbox, hframe, span, vbox} from '@xh/hoist/cmp/layout';
import {dialogPanel, panel} from '@xh/hoist/mobile/cmp/panel';
import {grid, GridSorter} from '@xh/hoist/cmp/grid';
import {button} from '@xh/hoist/mobile/cmp/button';
import {select} from '@xh/hoist/mobile/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {intersperse} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import './ZoneMapper.scss';
import {ZoneMapperModel} from './ZoneMapperModel';

/**
 * Hoist UI for user selection and discovery of available ZonedGrid columns, enabled via the
 * `ZonedGridModel.zoneMapperModel` config option.
 *
 * This component displays an example of each of the four zones, with the available columns for
 * the currently selected zone displayed in a list below. Users can toggle column visibility
 * and labels for each zone to construct a custom layout for the grid rows.
 *
 * It is not necessary to manually create instances of this component within an application.
 *
 * @internal
 */
export const [ZoneMapper, zoneMapper] = hoistCmp.withFactory<ZoneMapperModel>({
    displayName: 'ZoneMapper',
    model: uses(ZoneMapperModel),
    className: 'xh-zone-mapper',
    render({model, className}) {
        const {isOpen, showRestoreDefaults, isDirty} = model;
        return dialogPanel({
            isOpen,
            title: 'Customize Grid Fields',
            icon: Icon.gridLarge(),
            className,
            items: [zonePicker(), grid(), sortPicker()],
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

const zonePicker = hoistCmp.factory<ZoneMapperModel>({
    render({model}) {
        const {leftFlex, rightFlex} = model,
            className = 'xh-zone-mapper__zone-picker';

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

const zoneCell = hoistCmp.factory<ZoneMapperModel>({
    render({model, zone, flex}) {
        const {selectedZone, delimiter} = model,
            className = 'xh-zone-mapper__zone-picker__zone-cell',
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

const sortPicker = hoistCmp.factory<ZoneMapperModel>({
    render({model}) {
        const {sortBy} = model;
        return panel({
            title: 'Sorting',
            icon: Icon.list(),
            className: 'xh-zone-mapper__sort-picker',
            items: hframe(
                select({
                    bind: 'sortByColId',
                    enableFilter: true,
                    enableFullscreen: true,
                    title: 'Sorting',
                    fullScreenZIndex: 10002,
                    flex: 1,
                    options: model.sortByOptions
                }),
                button({
                    icon: getSortIcon(sortBy),
                    width: 45,
                    height: '100%',
                    onClick: () => model.setNextSortBy()
                })
            )
        });
    }
});

function getSortIcon(sortBy: GridSorter) {
    if (!sortBy) return null;
    const {abs, sort} = sortBy;
    if (sort === 'asc') {
        return abs ? Icon.sortAbsAsc() : Icon.sortAsc();
    } else if (sort === 'desc') {
        return abs ? Icon.sortAbsDesc() : Icon.sortDesc();
    }
}
