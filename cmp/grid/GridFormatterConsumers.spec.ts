/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {date, grid, GridModel, localDate, number, type ColumnSpec} from '@xh/hoist/cmp/grid';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {zoneGrid, ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';
import {dateRenderer, numberFormatter, numberRenderer} from '@xh/hoist/format';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {fireEvent, render, waitFor} from '@testing-library/react';
import {CsvExportModule, ModuleRegistry} from 'ag-grid-community';
import {sumBy, times} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * What each consumer of a cell's value sees for a column with a `formatter`. The built-in `number`
 * and date column specs format this way, so a consumer that reads only `Column.renderer` changes
 * for every app. Autosize, client export, filters and zone grids must see the display text, but a
 * client export to Excel keeps a number as a number. Copy sends the typed value, as it does for the
 * same column with a renderer. Server export reads its values through the same
 * `GridExportService.getExportableValueForCell` as copy.
 */
describe('Column.formatter', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        installAgGridForTests();
        ModuleRegistry.registerModules([CsvExportModule]);
    });

    const QTY = 1234567890.5,
        DAY = new Date(2026, 9, 7, 14, 5, 9);

    // Each formatter column beside a twin that formats the same value through a renderer.
    const twins: ColumnSpec[] = [
        {...number, field: 'qty', colId: 'fmt'},
        {...number, field: 'qty', colId: 'rnd', renderer: numberRenderer({})},
        {field: 'qty', colId: 'raw'},
        {...date, field: 'day', colId: 'dateFmt'},
        {...date, field: 'day', colId: 'dateRnd', renderer: dateRenderer()}
    ].map(it => ({...it, autosizeIncludeHeader: false}));

    it('sets the autosized width from the display text', async () => {
        const gridModel = await renderGridAsync({columns: twins});
        stubTextLayout();

        await gridModel.autosizeAsync({columns: ['fmt', 'rnd', 'raw', 'dateFmt', 'dateRnd']});
        const width = (colId: string) => gridModel.columnState.find(it => it.colId === colId).width;

        expect(width('fmt')).toBe(width('rnd'));
        expect(width('fmt')).not.toBe(width('raw'));
        expect(width('dateFmt')).toBe(width('dateRnd'));
    });

    it('counts the ledger placeholder when it picks the values to measure', async () => {
        // Autosize measures only the values whose text it estimates widest. Here a dozen negatives
        // out-estimate the one positive on their text alone, and only its placeholder makes the
        // positive the widest cell.
        const opts = {ledger: true, precision: 0} as const,
            ledgerCols: ColumnSpec[] = [
                {field: 'qty', colId: 'fmt', formatter: numberFormatter(opts)},
                {field: 'qty', colId: 'rnd', renderer: numberRenderer(opts)}
            ].map(it => ({...it, autosizeIncludeHeader: false})),
            gridModel = await renderGridAsync({columns: ledgerCols});
        gridModel.loadData([
            {id: 0, qty: 1_000_000},
            ...times(12, i => ({id: i + 1, qty: -99_900 - i}))
        ]);
        stubTextLayout();

        await gridModel.autosizeAsync({columns: ['fmt', 'rnd'], bufferPx: 0});
        const width = (colId: string) => gridModel.columnState.find(it => it.colId === colId).width;

        expect(width('rnd')).toBe(charsWidth('1,000,000)'));
        expect(width('fmt')).toBe(width('rnd'));
    });

    it('leaves copy with the typed value, as for a renderer', async () => {
        const gridModel = await renderGridAsync({columns: twins}),
            {agApi} = gridModel,
            copy = agApi.getGridOption('processCellForClipboard'),
            node = agApi.getRowNode(gridModel.store.getById(1).agId),
            copied = (colId: string) =>
                copy({node, column: agApi.getColumn(colId), value: null} as any);

        expect(copied('fmt')).toBe(copied('rnd'));
        expect(copied('fmt')).toBe(String(QTY));
        expect(copied('dateFmt')).toBe(copied('dateRnd'));
        expect(copied('dateFmt')).toBe('2026-10-07 14:05:09');
    });

    it('supplies the display text to localExport', async () => {
        const gridModel = await renderGridAsync({columns: twins}),
            {agApi} = gridModel;

        // Build the CSV that localExport would download.
        let csv: string;
        vi.spyOn(agApi, 'exportDataAsCsv').mockImplementation(params => {
            csv = agApi.getDataAsCsv(params);
        });
        gridModel.localExport('test', 'csv', {columnKeys: ['fmt', 'dateFmt']});

        expect(csv.split('\r\n')[1]).toBe('"1,234,567,891","2026-10-07"');
    });

    it('keeps numbers as numbers in a localExport to Excel', async () => {
        const gridModel = await renderGridAsync({columns: twins}),
            {agApi} = gridModel;

        // Excel export is an enterprise module, so run its cell callback through the CSV writer
        // and see what each cell would hold. A number stays a number, so Excel can sum it.
        let row: string;
        vi.spyOn(agApi, 'exportDataAsExcel').mockImplementation(params => {
            const {columnKeys, processCellCallback} = params;
            row = agApi
                .getDataAsCsv({
                    columnKeys,
                    processCellCallback: p => processCellCallback({...p, type: 'excel'})
                })
                .split('\r\n')[1];
        });
        gridModel.localExport('test', 'excel', {columnKeys: ['fmt', 'dateFmt']});

        expect(row).toBe(`"${QTY}","2026-10-07"`);
    });

    it('supplies the display text to StoreFilterField matching', async () => {
        const gridModel = await renderGridAsync({columns: [{...date, field: 'day'}]}),
            {container} = render(storeFilterField({model: gridModel, gridModel, filterBuffer: 0}));

        fireEvent.change(container.querySelector('input'), {target: {value: '2026-10-07'}});

        await waitFor(() => expect(gridModel.store.records.map(it => it.id)).toEqual([1]));
    });

    it('supplies the display text and value classes to ZoneGrid', async () => {
        const zoneGridModel = new ZoneGridModel({
            columns: [
                {field: 'name'},
                {...localDate, field: 'tradeDay'},
                {field: 'qty', formatter: numberFormatter({precision: 0, colorSpec: true})}
            ],
            mappings: {tl: 'name', tr: 'qty', bl: 'tradeDay', br: []}
        });
        onTestFinished(() => zoneGridModel.destroy());
        zoneGridModel.loadData([
            {id: 1, name: 'Alpha', qty: QTY, tradeDay: LocalDate.get('2026-10-07')}
        ]);

        const {container} = render(zoneGrid({model: zoneGridModel, width: 600, height: 400})),
            zone = (side: string) =>
                container.querySelector(`.ag-row .xh-zone-grid-cell--${side}`) as HTMLElement;
        await waitFor(() => expect(zone('right')).not.toBeNull());

        expect(zone('left').textContent).toContain('2026-10-07');
        const qty = zone('right').querySelector('.xh-zone-grid-cell__text-container');
        expect(qty.textContent).toBe('1,234,567,891');
        expect(qty.classList.contains('xh-pos-val')).toBe(true);
    });

    async function renderGridAsync(config): Promise<GridModel> {
        const gridModel = new GridModel({
            store: {
                fields: [
                    {name: 'qty', type: 'number'},
                    {name: 'day', type: 'date'}
                ]
            },
            ...config
        });
        onTestFinished(() => gridModel.destroy());
        gridModel.loadData([
            {id: 1, qty: QTY, day: DAY},
            {id: 2, qty: -1, day: new Date(2024, 0, 15)}
        ]);

        const {container} = render(grid({model: gridModel, width: 600, height: 400}));
        await waitFor(() => expect(container.querySelectorAll('.ag-row')).toHaveLength(2));
        return gridModel;
    }
});

/**
 * Width of text in the stub layout below: 7px per character, but 3px for a comma and 10px for a
 * parenthesis. Wide parentheses let a negative's pair outweigh a positive's extra digit.
 */
function charsWidth(s: string): number {
    return sumBy(Array.from(s ?? ''), c => (c === ',' ? 3 : '()'.includes(c) ? 10 : 7));
}

/**
 * jsdom has no layout. Give text the width of `charsWidth` - enough to tell display text from a
 * raw value - for the canvas and the hidden cell that the autosize calculator measures. The hidden
 * cell adds a parenthesis for the ledger alignment class, as its `::after` rule does. jsdom also
 * lacks `innerText`, which stands in here for `textContent`.
 */
function stubTextLayout() {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        measureText: (s: string) => ({width: charsWidth(s)})
    } as any);

    const proto = HTMLElement.prototype;
    Object.defineProperty(proto, 'clientWidth', {
        configurable: true,
        get() {
            if (!this.classList.contains('xh-grid-autosize-cell')) return 0;
            const ledgerAlign = this.classList.contains('xh-cell--ledger-align');
            return charsWidth(this.textContent + (ledgerAlign ? ')' : ''));
        }
    });
    Object.defineProperty(proto, 'innerText', {
        configurable: true,
        get() {
            return this.textContent;
        },
        set(v) {
            this.textContent = v;
        }
    });
    onTestFinished(() => {
        Reflect.deleteProperty(proto, 'clientWidth');
        Reflect.deleteProperty(proto, 'innerText');
    });
}
