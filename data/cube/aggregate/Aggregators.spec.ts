/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {
    type AggregationContext,
    Aggregator,
    type AggregatorToken,
    Cube,
    type CubeFieldSpec,
    type QueryConfig,
    SumIfUniqueAggregator,
    type View,
    type ViewRow,
    type ViewRowData
} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {isArray, sumBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * How built-in and custom aggregators roll leaf values up the rows of a Cube View. Apps show these
 * values as group and grand totals, where null handling decides between a blank and a misleading
 * zero. Apps also write their own aggregators - weighted averages, percent of total - against the
 * subclass contract tested here.
 */
describe('Aggregator', () => {
    beforeAll(() => initTestAppAsync());

    describe('built-in', () => {
        it('SUM totals non-null values, and is null where there are none', () => {
            expect(aggregateValues('SUM')).toMatchObject({
                'US/Tech': 10,
                US: 14,
                EU: null,
                Total: 23
            });
        });

        it('SUM_STRICT is null where any value beneath is null', () => {
            expect(aggregateValues('SUM_STRICT')).toMatchObject({
                'Asia/Tech': 3,
                Asia: 9,
                'US/Tech': null,
                US: null,
                Total: null
            });
        });

        it('AVG averages non-null values over all leaves beneath, not over child averages', () => {
            expect(aggregateValues('AVG')).toMatchObject({
                'US/Tech': 10,
                US: 7,
                EU: null,
                Asia: 3,
                Total: 4.6
            });
        });

        it('AVG_STRICT is null where any value beneath is null', () => {
            expect(aggregateValues('AVG_STRICT')).toMatchObject({
                'Asia/Tech': 1.5,
                Asia: 3,
                'US/Tech': null,
                US: null,
                Total: null
            });
        });

        it('MIN and MAX ignore null values', () => {
            expect(aggregateValues('MIN')).toMatchObject({
                'US/Tech': 10,
                US: 4,
                EU: null,
                Total: 1
            });
            expect(aggregateValues('MAX')).toMatchObject({US: 10, EU: null, Asia: 6, Total: 10});
        });

        it('MEDIAN takes the median of non-null values over all leaves, not of child medians', () => {
            // Medians of child medians would give Asia 3.75 and Total 5.375.
            expect(aggregateValues('MEDIAN')).toMatchObject({
                'US/Tech': 10,
                US: 7,
                EU: null,
                'Asia/Tech': 1.5,
                Asia: 2,
                Total: 4
            });
        });

        it('LEAF_COUNT counts the leaves beneath a row, CHILD_COUNT its direct children', () => {
            expect(aggregateValues('LEAF_COUNT')).toMatchObject({US: 3, EU: 2, Total: 8});
            expect(aggregateValues('CHILD_COUNT')).toMatchObject({US: 2, EU: 1, Total: 3});
        });

        it('UNIQUE publishes the value shared by all rows beneath, or null', () => {
            const cube = autoDestroy(
                new Cube({
                    fields: [
                        // Apps give dimensions UNIQUE to label parent rows with a shared value.
                        {name: 'region', isDimension: true, aggregator: 'UNIQUE'},
                        {name: 'sector', isDimension: true, aggregator: 'UNIQUE'},
                        {name: 'tradeDate', type: 'date', aggregator: 'UNIQUE'}
                    ],
                    data: [
                        {id: 1, region: 'US', sector: 'Tech', tradeDate: new Date(2026, 0, 5)},
                        {id: 2, region: 'US', sector: 'Energy', tradeDate: new Date(2026, 0, 5)},
                        {id: 3, region: 'EU', sector: 'Tech', tradeDate: new Date(2026, 0, 5)}
                    ]
                })
            );

            const [root] = cube.executeQuery(QUERY),
                [us, eu] = root.children;
            expect(us).toMatchObject({region: 'US', sector: null});
            expect(eu).toMatchObject({region: 'EU', sector: 'Tech'});
            expect(root).toMatchObject({region: null, sector: null});

            // Fixed in 59.5.0 (#3548) - equal dates held in separate objects compared unequal.
            expect(root.tradeDate).toEqual(new Date(2026, 0, 5));
        });
    });

    describe('SumIfUniqueAggregator', () => {
        it('sums only where all leaves with a value share the unique field, at any depth', () => {
            const view = autoDestroy(createAmountsCube().createView({query: QUERY}));

            // Both US groups are mixed, so publish a null currency. Comparing those published
            // values would wrongly find the US children in agreement.
            expect(valuesByPath(view, 'amount')).toMatchObject({
                'US/Tech': null,
                'US/Energy': null,
                US: null,
                'EU/Tech': 7,
                EU: 7,
                Asia: 5,
                LatAm: null,
                Total: null
            });
        });

        it('recomputes when only the unique field changes', async () => {
            const cube = createAmountsCube(),
                view = autoDestroy(cube.createView({query: QUERY, connect: true}));

            await cube.updateDataAsync([{...AMOUNTS[1], currency: 'USD'}]);
            expectReplaced(view, 'amount');
            expect(valuesByPath(view, 'amount')).toMatchObject({'US/Tech': 15, US: null});

            await cube.updateDataAsync([{...AMOUNTS[3], currency: 'USD'}]);
            expectReplaced(view, 'amount');
            expect(valuesByPath(view, 'amount')).toMatchObject({'US/Energy': 5, US: 20});
        });

        it('recomputes when an amount change resolves a mix', async () => {
            const cube = createAmountsCube(),
                view = autoDestroy(cube.createView({query: QUERY, connect: true}));

            // Nulling the only EUR amount in each US group leaves them all USD.
            await cube.updateDataAsync([{...AMOUNTS[1], amount: null}]);
            expectReplaced(view, 'amount');
            expect(valuesByPath(view, 'amount')).toMatchObject({'US/Tech': 10, US: null});

            await cube.updateDataAsync([{...AMOUNTS[3], amount: null}]);
            expectReplaced(view, 'amount');
            expect(valuesByPath(view, 'amount')).toMatchObject({'US/Energy': 4, US: 14});
        });

        it('treats a null in the unique field as a value of its own', () => {
            const view = autoDestroy(
                createAmountsCube([
                    {id: 1, region: 'US', sector: 'Tech', currency: 'USD', amount: 10},
                    {id: 2, region: 'US', sector: 'Tech', currency: null, amount: 5},
                    {id: 3, region: 'EU', sector: 'Tech', currency: null, amount: 2},
                    {id: 4, region: 'EU', sector: 'Energy', currency: null, amount: 3}
                ]).createView({query: QUERY})
            );
            expect(valuesByPath(view, 'amount')).toMatchObject({US: null, EU: 5, Total: null});
        });

        it('reads the unique field from source records, so it need not be queried', () => {
            const view = autoDestroy(
                createAmountsCube().createView({
                    query: {...QUERY, fields: ['region', 'sector', 'amount'], includeLeaves: true}
                })
            );
            expect(valuesByPath(view, 'amount')).toMatchObject({US: null, EU: 7, Asia: 5});
        });
    });

    describe('custom subclass', () => {
        it('composes a weighted average from the state of each child', () => {
            const cube = createPositionsCube(new WeightedAverageAggregator('qty')),
                view = autoDestroy(cube.createView({query: QUERY}));

            // A plain average of these prices would be 22.5.
            expect(valuesByPath(view, 'price')).toMatchObject({
                'US/Tech': 25,
                US: 21,
                EU: 45,
                Total: 25
            });

            // Rows reused across a regroup must recompute their state.
            view.updateQuery({dimensions: ['sector', 'region']});
            expect(valuesByPath(view, 'price')).toMatchObject({
                Tech: 29,
                'Tech/US': 25,
                Energy: 5,
                Total: 25
            });
        });

        it('recomputes when only the weight it reads changes', async () => {
            // Opting out of dependsOnChildrenOnly is what makes this work - left to default, an
            // update to qty alone would leave the weighted price stale.
            const cube = createPositionsCube(new WeightedAverageAggregator('qty')),
                view = autoDestroy(cube.createView({query: QUERY, connect: true}));

            await cube.updateDataAsync([
                {id: 2, region: 'US', sector: 'Tech', qty: 100, price: 30}
            ]);
            expect(valuesByPath(view, 'price')).toMatchObject({
                'US/Tech': 20,
                US: 15,
                Total: 22.5
            });
        });

        it('walks all leaves beneath a row via forEachLeaf, and updates in place', async () => {
            // Most app aggregators override aggregate() alone - the inherited replace() calls it.
            const cube = autoDestroy(
                    new Cube({
                        fields: [
                            {name: 'region', isDimension: true},
                            {name: 'sector', isDimension: true},
                            {name: 'pnl', aggregator: new GrossAggregator()}
                        ],
                        data: [
                            {id: 1, region: 'US', sector: 'Tech', pnl: 5},
                            {id: 2, region: 'US', sector: 'Tech', pnl: -3},
                            {id: 3, region: 'US', sector: 'Energy', pnl: -4},
                            {id: 4, region: 'EU', sector: 'Tech', pnl: 2}
                        ]
                    })
                ),
                view = autoDestroy(cube.createView({query: QUERY, connect: true}));

            expect(valuesByPath(view, 'pnl')).toMatchObject({'US/Tech': 8, US: 12, Total: 14});

            await cube.updateDataAsync([{id: 2, region: 'US', sector: 'Tech', pnl: 1}]);
            expect(view.diagnostics.update.last.type).toBe('dataOnly');
            expect(valuesByPath(view, 'pnl')).toMatchObject({'US/Tech': 6, US: 10, Total: 12});
        });

        it('must opt out of dependsOnChildrenOnly to read filteredRecords', () => {
            // Since v87.0.0, Views do not maintain filteredRecords for children-only aggregators.
            class RecordCountAggregator extends Aggregator {
                override aggregate(rows: ViewRow[], fieldName: string, ctx: AggregationContext) {
                    return ctx.filteredRecords.length;
                }
            }
            const cube = createPositionsCube(new RecordCountAggregator());

            expect(() => cube.createView({query: QUERY})).toThrow(
                "The aggregator for the 'price' field read `filteredRecords`"
            );
        });

        it('reads filteredRecords to keep a percent of total current', async () => {
            const cube = autoDestroy(
                    new Cube({
                        fields: [
                            {name: 'region', isDimension: true},
                            {name: 'sector', isDimension: true},
                            {name: 'qtyPct', aggregator: new PctOfTotalAggregator()}
                        ],
                        // Leaves carry quantities - parent rows publish their share of the total.
                        data: [
                            {id: 1, region: 'US', sector: 'Tech', qtyPct: 300},
                            {id: 2, region: 'US', sector: 'Energy', qtyPct: 100},
                            {id: 3, region: 'EU', sector: 'Tech', qtyPct: 100},
                            {id: 4, region: 'EU', sector: 'Energy', qtyPct: 500}
                        ]
                    })
                ),
                view = autoDestroy(cube.createView({query: QUERY, connect: true}));

            expect(valuesByPath(view, 'qtyPct')).toMatchObject({
                'US/Tech': 30,
                US: 40,
                EU: 60,
                Total: 100
            });

            // Rows left with the same leaves must still recompute against the new total.
            view.setFilter({field: 'sector', op: '=', value: 'Tech'});
            expect(valuesByPath(view, 'qtyPct')).toMatchObject({
                'US/Tech': 75,
                US: 75,
                EU: 25,
                Total: 100
            });

            await cube.updateDataAsync([{id: 3, region: 'EU', sector: 'Tech', qtyPct: 300}]);
            expect(valuesByPath(view, 'qtyPct')).toMatchObject({
                'US/Tech': 50,
                US: 50,
                EU: 50,
                Total: 100
            });
        });
    });

    describe('incremental update', () => {
        // A connected View applies a value-only tick through each aggregator's replace() rather
        // than re-aggregating. These pin that replace() lands exactly where a rebuild would.
        it('SUM becomes null when its last value is nulled, and holds a genuine zero', async () => {
            const {cube, view} = createValuesView('SUM');

            await cube.updateDataAsync([valueUpdate(1, null)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({'US/Tech': null, US: 4, Total: 13});

            await cube.updateDataAsync([valueUpdate(3, 0)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({'US/Energy': 0, US: 0, Total: 9});
        });

        it('SUM_STRICT re-aggregates at every level as the nulls beneath it are filled', async () => {
            const {cube, view} = createValuesView('SUM_STRICT');

            await cube.updateDataAsync([valueUpdate(2, 5)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({'US/Tech': 15, US: 19, Total: null});

            await cube.updateDataAsync([valueUpdate(4, 1), valueUpdate(5, 2)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({EU: 3, Total: 31});
        });

        it('AVG re-averages over all leaves beneath, not over child averages', async () => {
            const {cube, view} = createValuesView('AVG');

            await cube.updateDataAsync([valueUpdate(3, 10)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({'US/Tech': 10, US: 10, Total: 5.8});
        });

        it('MEDIAN re-takes the median over all leaves beneath', async () => {
            const {cube, view} = createValuesView('MEDIAN');

            await cube.updateDataAsync([valueUpdate(3, 10)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({US: 10, Total: 6});

            // Asia/Tech holds its median of 1.5, but the values behind it move - Asia must follow.
            await cube.updateDataAsync([valueUpdate(6, 0), valueUpdate(7, 3)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({'Asia/Tech': 1.5, Asia: 3});
        });

        it('MEDIAN re-aggregates a parent when a child holds its median over new leaves', async () => {
            const {cube, view} = createValuesView('MEDIAN');

            // US/Tech holds its median of 10, but US now takes the median of 10, 10 and 4.
            await cube.updateDataAsync({add: [{id: 9, region: 'US', sector: 'Tech', value: 10}]});
            expect(valuesByPath(view, 'value')).toMatchObject({'US/Tech': 10, US: 10, Total: 5});
            expect(valuesByPath(view, 'value')).toEqual(
                valuesByPath(cube.executeQuery(QUERY), 'value')
            );
        });

        it('MEDIAN leaves out the leaves of a row whose canAggregateFn returns false', async () => {
            // As AVG and the other built-ins do - the row publishes null, and its parent skips it.
            const cube = autoDestroy(
                    new Cube({
                        fields: [
                            {name: 'region', isDimension: true},
                            {name: 'sector', isDimension: true},
                            {
                                name: 'value',
                                type: 'number',
                                aggregator: 'MEDIAN',
                                canAggregateFn: (dim, val, applied) =>
                                    !(dim === 'sector' && val === 'Tech' && applied.region === 'US')
                            }
                        ],
                        data: VALUES
                    })
                ),
                view = autoDestroy(cube.createView({query: QUERY, connect: true}));

            expect(valuesByPath(view, 'value')).toMatchObject({'US/Tech': null, US: 4, Total: 3});

            await cube.updateDataAsync([valueUpdate(1, 100)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({US: 4, Total: 3});

            await cube.updateDataAsync([valueUpdate(3, 8)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({US: 8, Total: 4});
        });

        it('LEAF_COUNT and CHILD_COUNT are unchanged by a value tick', async () => {
            const {cube, view} = createValuesView('LEAF_COUNT');

            await cube.updateDataAsync([valueUpdate(1, 99)]);
            expectReplaced(view);
            expect(valuesByPath(view, 'value')).toMatchObject({US: 3, Total: 8});
        });

        it('UNIQUE re-collapses on a tick, comparing values deeply', async () => {
            const cube = autoDestroy(
                    new Cube({
                        fields: [
                            {name: 'region', isDimension: true},
                            {name: 'sector', isDimension: true},
                            {name: 'tag', type: 'json', aggregator: 'UNIQUE'}
                        ],
                        data: [
                            {id: 1, region: 'US', sector: 'Tech', tag: {a: 1}},
                            {id: 2, region: 'US', sector: 'Tech', tag: {a: 1}}
                        ]
                    })
                ),
                view = autoDestroy(cube.createView({query: QUERY, connect: true}));

            await cube.updateDataAsync([{id: 2, region: 'US', sector: 'Tech', tag: {a: 2}}]);
            expectReplaced(view, 'tag');
            expect(valuesByPath(view, 'tag')).toMatchObject({'US/Tech': null, Total: null});

            await cube.updateDataAsync([{id: 2, region: 'US', sector: 'Tech', tag: {a: 1}}]);
            expectReplaced(view, 'tag');
            expect(valuesByPath(view, 'tag')).toMatchObject({'US/Tech': {a: 1}, Total: {a: 1}});
        });
    });
});

//------------------
// Test data
//------------------
// Grouped by region and sector, with a grand total.
const QUERY: QueryConfig = {dimensions: ['region', 'sector'], includeRoot: true};

// Values with nulls placed to exercise each aggregator's null handling.
const VALUES = [
    {id: 1, region: 'US', sector: 'Tech', value: 10},
    {id: 2, region: 'US', sector: 'Tech', value: null},
    {id: 3, region: 'US', sector: 'Energy', value: 4},
    {id: 4, region: 'EU', sector: 'Tech', value: null},
    {id: 5, region: 'EU', sector: 'Tech', value: null},
    {id: 6, region: 'Asia', sector: 'Tech', value: 1},
    {id: 7, region: 'Asia', sector: 'Tech', value: 2},
    {id: 8, region: 'Asia', sector: 'Energy', value: 6}
];

// Positions held at a price.
const POSITIONS = [
    {id: 1, region: 'US', sector: 'Tech', qty: 100, price: 10},
    {id: 2, region: 'US', sector: 'Tech', qty: 300, price: 30},
    {id: 3, region: 'US', sector: 'Energy', qty: 100, price: 5},
    {id: 4, region: 'EU', sector: 'Tech', qty: 100, price: 45}
];

// Amounts in mixed currencies - both US groups mix them, and EU has an unpriced leaf.
const AMOUNTS = [
    {id: 1, region: 'US', sector: 'Tech', currency: 'USD', amount: 10},
    {id: 2, region: 'US', sector: 'Tech', currency: 'EUR', amount: 5},
    {id: 3, region: 'US', sector: 'Energy', currency: 'USD', amount: 4},
    {id: 4, region: 'US', sector: 'Energy', currency: 'EUR', amount: 1},
    {id: 5, region: 'EU', sector: 'Tech', currency: 'EUR', amount: 7},
    {id: 6, region: 'EU', sector: 'Tech', currency: 'USD', amount: null},
    {id: 7, region: 'Asia', sector: 'Tech', currency: 'JPY', amount: 2},
    {id: 8, region: 'Asia', sector: 'Energy', currency: 'JPY', amount: 3},
    {id: 9, region: 'LatAm', sector: 'Tech', currency: 'BRL', amount: null}
];

/** The aggregator from the Cube README - a weighted average, composed from aggregator state. */
class WeightedAverageAggregator extends Aggregator {
    readonly weightField: string;

    constructor(weightField: string) {
        super();
        this.weightField = weightField;
    }

    override get dependsOnChildrenOnly() {
        return false;
    }

    override aggregate(rows: ViewRow[], fieldName: string, context: AggregationContext) {
        let weighted = 0,
            weight = 0;

        for (const row of rows) {
            const state = row.isLeaf ? null : context.getAggState<WeightedState>(row);
            if (state) {
                weighted += state.weighted;
                weight += state.weight;
            } else {
                const val = row.data[fieldName],
                    w = row.data[this.weightField];
                if (val != null && w != null) {
                    weighted += val * w;
                    weight += w;
                }
            }
        }

        context.setAggState<WeightedState>({weighted, weight});
        return weight ? weighted / weight : null;
    }
}

interface WeightedState {
    weighted: number;
    weight: number;
}

/** Gross exposure - the sum of absolute values, walking every leaf beneath each row. */
class GrossAggregator extends Aggregator {
    override aggregate(rows: ViewRow[], fieldName: string) {
        let ret = 0;
        this.forEachLeaf(rows, leaf => {
            ret += Math.abs(leaf.data[fieldName] ?? 0);
        });
        return ret;
    }
}

/** Percent of the View's total - after the pattern in Toolbox's Cube test page. */
class PctOfTotalAggregator extends Aggregator {
    override get dependsOnChildrenOnly() {
        return false;
    }

    override aggregate(rows: ViewRow[], fieldName: string, context: AggregationContext) {
        // Cache the total in appData, which is fresh for each pass over the View.
        const {appData, filteredRecords} = context,
            total = (appData[fieldName] ??= sumBy(filteredRecords, it => it.data[fieldName]));

        let ret = 0;
        this.forEachLeaf(rows, leaf => {
            ret += leaf.data[fieldName];
        });
        return (ret / total) * 100;
    }
}

/** Aggregate VALUES with the given aggregator, returning its result at each row by path. */
function aggregateValues(aggregator: AggregatorToken): PlainObject {
    return valuesByPath(createValuesView(aggregator).view, 'value');
}

/** A connected View over VALUES, with `value` aggregated by the given aggregator. */
function createValuesView(aggregator: AggregatorToken): {cube: Cube; view: View} {
    const cube = autoDestroy(
            new Cube({
                fields: [
                    {name: 'region', isDimension: true},
                    {name: 'sector', isDimension: true},
                    {name: 'value', type: 'number', aggregator}
                ],
                data: VALUES
            })
        ),
        view = autoDestroy(cube.createView({query: QUERY, connect: true}));
    return {cube, view};
}

/** The VALUES record with the given id, carrying a new value. */
function valueUpdate(id: number, value: number): PlainObject {
    return {...VALUES.find(it => it.id === id), value};
}

/** Assert the last tick ran through replace(), landing where a fresh aggregation would. */
function expectReplaced(view: View, field = 'value') {
    expect(view.diagnostics.update.last.type).toBe('dataOnly');
    expect(valuesByPath(view, field)).toEqual(valuesByPath(view.cube.executeQuery(QUERY), field));
}

function createPositionsCube(priceAggregator: Aggregator): Cube {
    const fields: CubeFieldSpec[] = [
        {name: 'region', isDimension: true},
        {name: 'sector', isDimension: true},
        {name: 'qty', type: 'int', aggregator: 'SUM'},
        {name: 'price', type: 'int', aggregator: priceAggregator}
    ];
    return autoDestroy(new Cube({fields, data: POSITIONS}));
}

function createAmountsCube(data: PlainObject[] = AMOUNTS): Cube {
    return autoDestroy(
        new Cube({
            fields: [
                {name: 'region', isDimension: true},
                {name: 'sector', isDimension: true},
                // Apps typically label groups with a UNIQUE currency - null where mixed.
                {name: 'currency', aggregator: 'UNIQUE'},
                {name: 'amount', type: 'number', aggregator: new SumIfUniqueAggregator('currency')}
            ],
            data
        })
    );
}

/** A field's value at each row of a grand-total result, keyed by path - e.g. 'US/Tech'. */
function valuesByPath(source: View | ViewRowData[], field: string): PlainObject {
    const rows = isArray(source) ? source : source.result.rows,
        ret = {},
        visit = (row: ViewRowData, path: string) => {
            ret[path] = row[field];
            row.children?.forEach(it =>
                visit(it, path === 'Total' ? it.cubeLabel : `${path}/${it.cubeLabel}`)
            );
        };
    visit(rows[0], 'Total');
    return ret;
}

function autoDestroy<T extends {destroy(): void}>(obj: T): T {
    onTestFinished(() => obj.destroy());
    return obj;
}
