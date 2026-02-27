import {
    filterConsecutiveMenuSeparators,
    filterConsecutiveToolbarSeparators
} from '@xh/hoist/utils/impl/Separators';

// Minimal stand-ins for Blueprint MenuDivider and Hoist ToolbarSeparator React elements.
const menuDivider = {type: {name: 'MenuDivider'}, props: {}};
const menuDividerWithTitle = {type: {name: 'MenuDivider'}, props: {title: 'Section'}};
const toolbarSep = {type: {displayName: 'ToolbarSeparator'}};

describe('filterConsecutiveMenuSeparators', () => {
    it('recognises the "-" string as a separator', () => {
        const fn = filterConsecutiveMenuSeparators();
        expect(['item1', '-', '-', 'item2'].filter(fn)).toEqual(['item1', '-', 'item2']);
    });

    it('recognises the "separator" string as a separator', () => {
        const fn = filterConsecutiveMenuSeparators();
        expect(['item1', 'separator', 'separator', 'item2'].filter(fn)).toEqual([
            'item1',
            'separator',
            'item2'
        ]);
    });

    it('recognises a MenuDivider element without a title as a separator', () => {
        const fn = filterConsecutiveMenuSeparators();
        expect(['item1', menuDivider, menuDivider, 'item2'].filter(fn)).toEqual([
            'item1',
            menuDivider,
            'item2'
        ]);
    });

    it('does NOT treat a titled MenuDivider as a separator', () => {
        const fn = filterConsecutiveMenuSeparators();
        // Both dividers survive because they are not considered separators.
        expect(['item1', menuDividerWithTitle, menuDividerWithTitle, 'item2'].filter(fn)).toEqual([
            'item1',
            menuDividerWithTitle,
            menuDividerWithTitle,
            'item2'
        ]);
    });

    it('removes leading and trailing separators', () => {
        const fn = filterConsecutiveMenuSeparators();
        expect(['-', 'item', '-'].filter(fn)).toEqual(['item']);
    });

    it('returns a new filter function each call', () => {
        expect(filterConsecutiveMenuSeparators()).not.toBe(filterConsecutiveMenuSeparators());
    });
});

describe('filterConsecutiveToolbarSeparators', () => {
    it('recognises the "-" string as a separator', () => {
        const fn = filterConsecutiveToolbarSeparators();
        expect(['item1', '-', '-', 'item2'].filter(fn)).toEqual(['item1', '-', 'item2']);
    });

    it('recognises a ToolbarSeparator element as a separator', () => {
        const fn = filterConsecutiveToolbarSeparators();
        expect(['item1', toolbarSep, toolbarSep, 'item2'].filter(fn)).toEqual([
            'item1',
            toolbarSep,
            'item2'
        ]);
    });

    it('removes all separators when the array contains only separators', () => {
        const fn = filterConsecutiveToolbarSeparators();
        expect(['-', '-', '-'].filter(fn)).toEqual([]);
    });

    it('preserves a single separator between non-separator items', () => {
        const fn = filterConsecutiveToolbarSeparators();
        expect(['a', '-', 'b'].filter(fn)).toEqual(['a', '-', 'b']);
    });
});
