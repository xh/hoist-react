/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, PlainObject} from '@xh/hoist/core';
import {dateInput, DateInputProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {warnIf} from '@xh/hoist/utils/js';
import {getOffsetRectRelativeToArbitraryNode, Popper} from 'popper.js/dist/popper-utils';
import {CSSProperties} from 'react';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export type DateEditorProps = EditorProps<DateInputProps>;

export const [DateEditor, dateEditor] = hoistCmp.withFactory<DateEditorProps>({
    displayName: 'DateEditor',
    className: 'xh-date-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        // We need to render the day picker popover inside the grid viewport in order for
        // `stopEditingWhenCellsLoseFocus` to work properly - otherwise the day picker becomes
        // unusable due to the grid losing focus and stopping editing when clicking inside picker
        const portalContainer = props.gridModel.agApi.gridBodyCtrl?.eBodyViewport;

        warnIf(
            !portalContainer,
            'Could not find the grid body viewport for rendering DateEditor picker popover.'
        );

        props = {
            ...props,
            inputProps: {
                rightElement: null,

                enablePicker: !!portalContainer,
                showPickerOnFocus: !!portalContainer,
                portalContainer,
                popoverBoundary: 'scrollParent',
                popoverModifiers: {
                    computeStyle: {
                        enabled: true,
                        fn: (data: Popper.Data, options) => computeStyleInAgGrid(data, options, portalContainer),
                        order: 850
                    },
                    // Turn off other modifiers
                    // that the new computeStyle overrides
                    // These would just waste cycles
                    flip: {enabled: false},
                    keepTogether: {enabled: false},
                    preventOverflow: {enabled: false},
                    hide: {enabled: false}
                },
                ...props.inputProps
            }
        };
        return useInlineEditorModel(dateInput, props, ref);
    }
});

/**
 * An implementation of https://popper.js.org/docs/v1/#modifiers..computeStyle function
 * that accounts for Ag-Grid's use of 2 different containers for vertical and horizontal scrolling
 *
 * This implementation allows the date picker to properly align with the dateInput cell
 * and stay with the cell as user scrolls in any direction.
 *
 * -- revisit when Hoist-React & Blueprintjs upgrade to popper2 --
 *
 * @param data - The data object generated by the popper.js `update` method
 * @param options - Modifiers configuration and options
 * @returns the data object, properly modified
 */
function computeStyleInAgGrid(data: Popper.Data, options: PlainObject, portalContainer: HTMLElement): Popper.Data {
    const styles = {
        position: data.offsets.popper.position,
        top: 0,
        left: 0,
        willChange: 'transform'
    } as CSSProperties;

    const inputEl = data.instance.reference,
        leftContainer = inputEl.closest('.ag-pinned-left-cols-container'),
        centerContainer = inputEl.closest('.ag-center-cols-clipper'),
        rightContainer = inputEl.closest('.ag-pinned-right-cols-container'),
        rowContainer = centerContainer || leftContainer || rightContainer;

    if (!rowContainer) {
        // prevent flash of popper in top left grid corner
        // right after closing
        data.styles.display = 'none';
        return data;
    }

    // recalc reference offsets with the dateEditor cell's column's ag-grid container of all rows
    data.offsets.reference = getOffsetRectRelativeToArbitraryNode(inputEl, rowContainer, false);
    if (rightContainer) {
        data.offsets.reference.left += rightContainer.offsetLeft;
        data.offsets.reference.right += rightContainer.offsetLeft;
    }

    const scrollLeft = rowContainer.parentNode.scrollLeft,
        {scrollTop, offsetWidth: pcWidth, offsetHeight: pcHeight} = portalContainer,
        {height: popperHeight, width: popperWidth} = data.offsets.popper,
        {top: inputElTop, bottom: inputElBottom, left: inputElLeft, right: inputElRight, width: inputElWidth} = data.offsets.reference,
        pcRight = pcWidth + scrollLeft;

    // Set popper top & left to avoid hiding popper behind grid edges when cell is visible.

    // Solve x axis (left).  Default position is center aligned.
    // If popper width is greater than grid width, popper stays center aligned.
    let trLeft = inputElLeft + (inputElWidth - popperWidth) / 2;

    const alignLeft = trLeft - scrollLeft < 0 && inputElLeft + popperWidth < pcRight,
        alignRight = trLeft + popperWidth > pcRight && inputElRight - popperWidth > scrollLeft;

    trLeft = alignLeft ? inputElLeft : alignRight ? inputElRight - popperWidth : trLeft;

    trLeft -= scrollLeft;

    // Solve y axis (top).  Default position is underneath cell
    // Flips to above if cell is near bottom of grid.
    // If poppper height is greater than grid height, the popper stays in the default position.
    const flipToAbove = popperHeight < pcHeight && inputElBottom - scrollTop + popperHeight > pcHeight,
        trTop = flipToAbove ? inputElTop - popperHeight : inputElBottom;

    styles.transform = 'translate3d(' + trLeft + 'px, ' + trTop + 'px, 0)';

    data.styles = Object.assign({}, styles, data.styles);

    return data;
}