/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {div, filler, hbox, hframe, span, vbox} from '@xh/hoist/cmp/layout';
import {ZoneMapperModel} from '@xh/hoist/cmp/zoneGrid/impl/ZoneMapperModel';
import {hoistCmp, HoistModel, lookup, managed, useLocalModel, uses, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {checkbox, select} from '@xh/hoist/mobile/cmp/input';
import {dialogPanel, panel} from '@xh/hoist/mobile/cmp/panel';
import {wait} from '@xh/hoist/promise';
import {intersperse} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import './ZoneMapper.scss';
import {isEmpty} from 'lodash';

/**
 * Hoist UI for user selection and discovery of available ZoneGrid columns, enabled via the
 * `ZoneGridModel.zoneMapperModel` config option.
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
        const {isOpen, showRestoreDefaults, isDirty} = model,
            impl = useLocalModel(ZoneMapperLocalModel);

        return dialogPanel({
            isOpen,
            title: 'Customize Fields',
            icon: Icon.gridLarge(),
            className,
            items: [
                introText({omit: XH.isLandscape}),
                zonePicker(),
                grid({model: impl.gridModel}),
                sortPicker()
            ],
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

const introText = hoistCmp.factory({
    render() {
        return div({
            className: 'xh-zone-mapper__intro-text',
            items: [
                'Tap any of the four quadrants in the sample row below to customize the fields displayed within. Fields will be shown in the order they are selected. The first field within the top zones will always be labelled by the column headers.'
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
                    text: model.getSortLabel(),
                    icon: model.getSortIcon(),
                    width: 80,
                    onClick: () => model.setNextSortBy()
                })
            )
        });
    }
});

class ZoneMapperLocalModel extends HoistModel {
    override xhImpl = true;
    @lookup(ZoneMapperModel) model: ZoneMapperModel;

    @managed
    gridModel: GridModel;

    override onLinked() {
        super.onLinked();

        this.gridModel = this.createGridModel();

        this.addReaction({
            track: () => [this.model.isOpen, this.model.mappings, this.model.selectedZone],
            run: () => this.syncGridAsync()
        });
    }

    private createGridModel(): GridModel {
        const {model} = this,
            {groupColumns, fields} = model,
            hasGrouping = groupColumns && fields.some(it => it.chooserGroup);

        return new GridModel({
            store: {idSpec: 'field'},
            groupBy: hasGrouping ? 'chooserGroup' : null,
            colDefaults: {movable: false, resizable: false, sortable: false},
            columns: [
                {
                    field: 'displayName',
                    headerName: 'Field',
                    flex: 1
                },
                {
                    field: 'show',
                    align: 'center',
                    renderer: (value, {record}) => {
                        const {field} = record.data;
                        return checkbox({value, onChange: () => model.toggleShown(field)});
                    }
                },
                {
                    field: 'showLabel',
                    headerName: 'Label',
                    align: 'center',
                    renderer: (value, {record}) => {
                        const {label, field} = record.data;
                        if (!label) return null;
                        return checkbox({value, onChange: () => model.toggleShowLabel(field)});
                    }
                },
                // Hidden
                {field: 'field', hidden: true},
                {field: 'label', hidden: true},
                {field: 'chooserGroup', hidden: true}
            ]
        });
    }

    private async syncGridAsync() {
        const {fields, mappings, limits, selectedZone} = this.model,
            mapping = mappings[selectedZone],
            limit = limits?.[selectedZone],
            data = [];

        // 1) Determine which fields are shown and labeled for the zone
        const allowedFields = !isEmpty(limit?.only)
            ? fields.filter(it => limit.only.includes(it.field))
            : fields;

        allowedFields.forEach(f => {
            const fieldMapping = mapping.find(it => f.field === it.field),
                show = !!fieldMapping,
                showLabel = fieldMapping?.showLabel ?? false;

            data.push({...f, show, showLabel});
        });

        // 2) Load into display grid
        this.gridModel.loadData(data);

        // 3) Blur checkboxes. This is a workaround for an Onsen issue on mobile, where the checkbox
        // will not re-render as long as it has focus.
        await wait(1);
        const checkboxes = document.querySelectorAll<HTMLInputElement>('ons-checkbox');
        checkboxes.forEach(it => it.blur());
    }
}
