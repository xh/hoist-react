import {grid, gridCountLabel, GridModel} from '@xh/hoist/cmp/grid';
import {a, filler, hframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, HoistModel, managed, useLocalModel, uses} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {InspectorModel} from '@xh/hoist/desktop/appcontainer/inspector/InspectorModel';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {trimToDepth} from '@xh/hoist/utils/js';
import {compact, find, forIn, isArray, isObject, without} from 'lodash';
import {isObservableProp, makeObservable} from 'mobx';

const {BOOL, STRING} = FieldType;

export const modelInstancePanel = hoistCmp.factory({
    model: uses(() => InspectorModel),

    /** @param {InspectorModel} model */
    render({model}) {
        const lm = useLocalModel(() => new LocalModel(model));
        return panel({
            item: hframe(
                panel({
                    flex: 1,
                    item: grid({
                        model: model.modelInstanceGridModel,
                        agOptions: {
                            suppressRowGroupHidesColumns: true,
                            suppressMakeColumnVisibleAfterUnGroup: true
                        }
                    }),
                    bbar: instanceGridBar()
                }),
                panel({
                    model: {
                        defaultSize: 500,
                        side: 'right',
                        persistWith: {...model.persistWith, path: 'propertiesGridPanel'}
                    },
                    item: grid({model: lm.propertiesGridModel}),
                    bbar: propertiesGridBar({model: lm})
                })
            )
        });
    }
});

const instanceGridBar = hoistCmp.factory(({model}) => {
    const {modelInstanceGridModel} = model;
    return toolbar({
        compact: true,
        items: [
            switchInput({
                bind: 'groupModelInstancesByClass',
                label: 'Group by class'
            }),
            filler(),
            gridCountLabel({unit: 'model', gridModel: modelInstanceGridModel}),
            '-',
            storeFilterField({gridModel: modelInstanceGridModel, matchMode: 'any'})
        ]
    });
});

const propertiesGridBar = hoistCmp.factory(
    /** @param {LocalModel} */
    ({model}) => {
        const {propertiesGridModel} = model;
        return toolbar({
            compact: true,
            items: [
                switchInput({
                    bind: 'observablePropsOnly',
                    label: 'Observables only',
                    labelSide: 'right'
                }),
                '-',
                switchInput({
                    bind: 'showUnderscoreProps',
                    label: '_props',
                    labelSide: 'right'
                }),
                filler(),
                gridCountLabel({unit: 'properties', gridModel: propertiesGridModel}),
                '-',
                storeFilterField({gridModel: propertiesGridModel, matchMode: 'any'})
            ]
        });
    }
);

class LocalModel extends HoistModel {
    /** @member {InspectorModel} */
    inspectorModel;

    /** @member {GridModel} */
    @managed propertiesGridModel;
    @bindable observablePropsOnly = false;
    @bindable showUnderscoreProps = false;

    @bindable.ref watchlist = [];

    /** @param {InspectorModel} inspectorModel */
    constructor(inspectorModel) {
        super();
        makeObservable(this);

        this.inspectorModel = inspectorModel;

        const iconCol = {width: 40, align: 'center', resizable: false};
        this.propertiesGridModel = new GridModel({
            sortBy: 'displayProperty',
            groupBy: 'displayGroup',
            groupSortFn: (a, b) => {
                a = a === 'Watchlist' ? 0 : 1;
                b = b === 'Watchlist' ? 0 : 1;
                return a - b;
            },
            store: {fields: ['xhId', 'property']},
            columns: [
                {
                    field: {name: 'isWatchlistItem', type: BOOL},
                    headerName: Icon.star(),
                    ...iconCol,
                    renderer: v => v ? Icon.star({prefix: 'fas', intent: 'warning'}) : Icon.star()
                },
                {
                    field: {name: 'displayProperty', displayName: 'Property', type: STRING},
                    width: 150
                },
                {
                    field: {name: 'isHoistModel', type: BOOL},
                    headerName: Icon.database(),
                    ...iconCol,
                    renderer: v => v ? Icon.database({title: 'Hoist Model'}) : ''
                },
                {
                    field: {name: 'isObservable', type: BOOL},
                    headerName: Icon.eye(),
                    ...iconCol,
                    renderer: v => v ? Icon.eye({title: 'Observable'}) : ''
                },
                {field: 'valueType', width: 130},
                {
                    field: 'value',
                    highlightOnChange: true,
                    flex: 1,
                    minWidth: 150,
                    renderer: (v, {record}) => {
                        if (record.data.isHoistModel) {
                            return a({item: v, onClick: () => inspectorModel.selectModel(v)});
                        }
                        const trimmed = isArray(v) ?
                            v.map(it => trimToDepth(it, 1)) :
                            isObject(v) ? trimToDepth(v, 1) : v;

                        return JSON.stringify(trimmed);
                    }
                },
                {field: 'displayGroup', hidden: true}
            ],
            onCellClicked: ({data: rec, column}) => {
                if (rec?.data && column.colId === 'isWatchlistItem') {
                    this.toggleWatchlistItem(rec.data.xhId, rec.data.property);
                }
            }
        });

        this.autoLoadPropertiesGrid();
    }

    toggleWatchlistItem(xhId, property) {
        const {watchlist} = this,
            currItem = this.getWatchlistItem(xhId, property);

        this.watchlist = currItem ?
            without(watchlist, currItem) :
            [...watchlist, {xhId, property}];
    }

    autoLoadPropertiesGrid() {
        this.addAutorun({
            run: () => {
                const {inspectorModel, propertiesGridModel} = this,
                    model = inspectorModel.selectedModel,
                    data = [];

                if (!model) {
                    propertiesGridModel.clear();
                } else {
                    forIn(model, (v, prop) => {
                        data.push(this.getRecData(model, prop));
                    });

                    this.watchlist.forEach(it => {
                        const wlModel = inspectorModel.getModelInstance(it.xhId);
                        if (wlModel) {
                            data.push(this.getRecData(wlModel, it.property, true));
                        }
                    });

                    propertiesGridModel.loadData(compact(data));
                }
            }
        });
    }

    getRecData(model, property, fromWatchlistItem = false) {
        const {observablePropsOnly, showUnderscoreProps} = this;
        if (!showUnderscoreProps && property.startsWith('_')) return null;

        const v = model[property],
            modelCtor = model.constructor.name,
            {xhId} = model,
            isObservable = isObservableProp(model, property),
            isHoistModel = v?.isHoistModel,
            isWatchlistItem = !!this.getWatchlistItem(xhId, property);

        return (!observablePropsOnly || isObservable) ?
            {
                id: `${xhId}-${property}${fromWatchlistItem ? '-wl' : ''}`,
                xhId,
                property,
                value: isHoistModel ? v.xhId : v,
                valueType: v?.constructor?.name ?? typeof v,
                isObservable,
                isHoistModel,
                isWatchlistItem,
                displayProperty: fromWatchlistItem ? `${modelCtor}[${xhId}].${property}` : property,
                displayGroup: fromWatchlistItem ? 'Watchlist' : modelCtor
            } : null;
    }

    getWatchlistItem(xhId, property) {
        return find(this.watchlist, {xhId, property});
    }
}
