/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/desktop/register';
import {hoistCmp, HoistModel, lookup, managed, useLocalModel, uses} from '@xh/hoist/core';
import {div, filler, hbox, p, span, vbox} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {intersperse} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import classNames from 'classnames';
import './ZoneMapper.scss';
import {ZoneMapperModel} from '@xh/hoist/cmp/zoneGrid/impl/ZoneMapperModel';

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
        const {showRestoreDefaults, isDirty} = model,
            impl = useLocalModel(ZoneMapperLocalModel);

        return panel({
            className,
            items: [introText(), zonePicker(), grid({model: impl.gridModel}), sortPicker()],
            bbar: [
                button({
                    omit: !showRestoreDefaults,
                    text: 'Restore Defaults',
                    icon: Icon.undo({className: 'xh-red'}),
                    onClick: () => model.restoreDefaultsAsync()
                }),
                filler(),
                button({
                    text: 'Cancel',
                    onClick: () => model.close()
                }),
                '-',
                button({
                    text: 'Save',
                    icon: Icon.check(),
                    intent: 'success',
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

const introText = hoistCmp.factory<ZoneMapperModel>({
    render({model}) {
        return div({
            className: 'xh-zone-mapper__intro-text',
            items: [
                p(
                    Icon.questionCircle(),
                    'Click to highlight any of the four quadrants in the sample row below, then check the field(s) you wish to show in that zone.'
                ),
                p('Fields will be shown in the order they are selected.'),
                p({
                    omit: model.headersAreHidden,
                    item: 'The first field within the top two zones will always be labelled by the column headers.'
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
            items: delimiter ? intersperse(samples, span(delimiter)) : samples
        });
    }
});

const sortPicker = hoistCmp.factory<ZoneMapperModel>({
    render({model}) {
        return panel({
            className: 'xh-zone-mapper__sort-picker',
            title: 'Sorting',
            icon: Icon.list(),
            compactHeader: true,
            contentBoxProps: {
                alignItems: 'center',
                flexDirection: 'row',
                gap: true,
                padding: true
            },
            items: [
                select({
                    bind: 'sortByColId',
                    enableFilter: true,
                    flex: 1,
                    options: model.sortByOptions
                }),
                button({
                    text: model.getSortLabel(),
                    icon: model.getSortIcon(),
                    width: 80,
                    minimal: false,
                    onClick: () => model.setNextSortBy()
                })
            ]
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
            track: () => [
                this.model.isOpen,
                this.model.isPopoverOpen,
                this.model.mappings,
                this.model.selectedZone
            ],
            run: () => this.syncGrid(),
            fireImmediately: true
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
            selModel: 'disabled',
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

    private syncGrid() {
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
    }
}
