/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {booleanEditor, dateEditor, selectEditor, textEditor} from '@xh/hoist/desktop/cmp/grid';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {wait} from '@xh/hoist/promise';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * How inline editors handle the printable key that starts an edit, as when a user selects a cell
 * and types. Only a text or number value takes the key as its value. A select enters it as search
 * text, a date input as typed text, and a checkbox ignores it.
 */
beforeAll(async () => {
    await initTestAppAsync();
    installAgGridForTests();
    // jsdom has no layout, so lacks the `scrollIntoView()` that Select calls on opening its menu.
    Element.prototype.scrollIntoView = () => {};
});

afterAll(() => {
    delete Element.prototype.scrollIntoView;
});

describe('SelectEditor', () => {
    it('enters the key that starts an edit as search text and opens the menu', async () => {
        const {gridModel} = await renderGridAsync(),
            input = await startEditWithKeyAsync(gridModel, 'category', 'E');

        await waitFor(() => expect(input.value).toBe('E'));
        expect(menuOptions()).toEqual(['Emerging Markets', 'EU']);
    });

    it('keeps the value when an edit started by a key ends without a pick', async () => {
        const {gridModel} = await renderGridAsync(),
            input = await startEditWithKeyAsync(gridModel, 'category', 'E');
        await waitFor(() => expect(input.value).toBe('E'));

        gridModel.agApi.stopEditing();
        await waitFor(() => expect(gridModel.isEditing).toBe(false));
        expect(gridModel.store.getById(1).data.category).toBe('EU');
        expect(gridModel.store.isModified).toBe(false);
    });

    it('ignores the key that starts an edit when search is off', async () => {
        const {gridModel} = await renderGridAsync({enableFilter: false}),
            input = await startEditWithKeyAsync(gridModel, 'category', 'E');

        await settleAsync();
        expect(input.value).toBe('');
        expect(menuOptions()).toEqual([]);

        gridModel.agApi.stopEditing();
        await waitFor(() => expect(gridModel.isEditing).toBe(false));
        expect(gridModel.store.getById(1).data.category).toBe('EU');
    });
});

describe('TextEditor', () => {
    it('enters the key that starts an edit as the value', async () => {
        const {gridModel} = await renderGridAsync(),
            input = await startEditWithKeyAsync(gridModel, 'name', 'Z');

        await waitFor(() => expect(input.value).toBe('Z'));
        gridModel.agApi.stopEditing();
        await waitFor(() => expect(gridModel.store.getById(1).data.name).toBe('Z'));
    });
});

describe('DateEditor', () => {
    it('enters the key that starts an edit as typed text, not as the value', async () => {
        const {gridModel} = await renderGridAsync(),
            input = await startEditWithKeyAsync(gridModel, 'tradeDate', '5');

        await waitFor(() => expect(input.value).toBe('5'));
        gridModel.agApi.stopEditing();
        await waitFor(() => expect(gridModel.isEditing).toBe(false));
        expect(gridModel.store.getById(1).data.tradeDate).toEqual(LocalDate.get('2026-01-05'));
        expect(gridModel.store.isModified).toBe(false);
    });

    it('commits a date typed after the key that starts an edit', async () => {
        const {gridModel} = await renderGridAsync(),
            input = await startEditWithKeyAsync(gridModel, 'tradeDate', '2');
        await waitFor(() => expect(input.value).toBe('2'));

        fireEvent.change(input, {target: {value: '2026-03-01'}});
        gridModel.agApi.stopEditing();
        await waitFor(() =>
            expect(gridModel.store.getById(1).data.tradeDate).toEqual(LocalDate.get('2026-03-01'))
        );
    });
});

describe('BooleanEditor', () => {
    it('ignores the key that starts an edit', async () => {
        const {gridModel} = await renderGridAsync();
        await startEditWithKeyAsync(gridModel, 'active', 'x');

        await settleAsync();
        gridModel.agApi.stopEditing();
        await waitFor(() => expect(gridModel.isEditing).toBe(false));
        expect(gridModel.store.getById(1).data.active).toBe(false);
        expect(gridModel.store.isModified).toBe(false);
    });
});

//------------------
// Helpers
//------------------
async function renderGridAsync(selectProps = {}) {
    const gridModel = new GridModel({
        store: {
            fields: [
                {name: 'tradeDate', type: 'localDate'},
                {name: 'active', type: 'bool'}
            ]
        },
        columns: [
            {field: 'name', editable: true, editor: textEditor},
            {
                field: 'category',
                editable: true,
                editor: props =>
                    selectEditor({
                        ...props,
                        inputProps: {options: ['US', 'Emerging Markets', 'EU'], ...selectProps}
                    })
            },
            {field: 'tradeDate', editable: true, editor: dateEditor},
            {
                field: 'active',
                editable: true,
                editor: props => booleanEditor({...props, quickToggle: false})
            }
        ]
    });
    onTestFinished(() => gridModel.destroy());
    gridModel.loadData([
        {
            id: 1,
            name: 'Alpha',
            category: 'EU',
            tradeDate: LocalDate.get('2026-01-05'),
            active: false
        }
    ]);

    const {container} = render(grid({model: gridModel, width: 1000, height: 400}));
    await waitFor(() => expect(container.querySelectorAll('.ag-row')).toHaveLength(1));
    return {gridModel, container};
}

// Start editing a cell as ag-Grid does when a user types `key` on it, and return the focused input.
async function startEditWithKeyAsync(gridModel: GridModel, colKey: string, key: string) {
    gridModel.agApi.startEditingCell({rowIndex: 0, colKey, key});
    let input: HTMLInputElement;
    await waitFor(() => {
        input = document.activeElement as HTMLInputElement;
        expect(input?.closest('.xh-inline-editor')).not.toBeNull();
    });
    return input;
}

// Give the editor time to handle the key that started the edit, when asserting it did nothing.
function settleAsync() {
    return wait(50);
}

function menuOptions(): string[] {
    return Array.from(document.querySelectorAll('.xh-select__option')).map(it => it.textContent);
}
