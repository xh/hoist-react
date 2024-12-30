/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';
import {DashContainerModel} from '@xh/hoist/desktop/cmp/dash';
import {serializeIcon} from '@xh/hoist/icon';
import {throwIf} from '@xh/hoist/utils/js';
import {isArray, isEmpty, isFinite, isNil, isPlainObject, isString, round} from 'lodash';
import {DashContainerViewSpec} from '../DashContainerViewSpec';
import GoldenLayout, {ContentItem} from 'golden-layout';

/**
 * Lookup the DashViewModel id of a rendered view
 */
export function getViewModelId(view) {
    if (!view || !view.isInitialised || !view.isComponent) return;
    return view.instance?._reactComponent?.props?.id;
}

/**
 * Convert the output from Golden Layouts into our serializable state
 */
export function convertGLToState(
    goldenLayout: GoldenLayout,
    dashContainerModel: DashContainerModel
) {
    const configItems = goldenLayout.toConfig().content,
        contentItems = goldenLayout.root.contentItems;

    return convertGLToStateInner(configItems, contentItems, dashContainerModel);
}

function convertGLToStateInner(
    configItems = [],
    contentItems: ContentItem[] = [],
    dashContainerModel: DashContainerModel
) {
    const ret = [];

    configItems.forEach((configItem, idx) => {
        const contentItem = contentItems[idx];

        if (configItem.type === 'component') {
            const viewSpecId: string = configItem.component,
                viewSpec = dashContainerModel.getViewSpec(viewSpecId),
                viewModelId = getViewModelId(contentItem),
                viewModel = dashContainerModel.getViewModel(viewModelId),
                view = {type: 'view', id: viewSpecId} as PlainObject;
            if (viewModel.icon !== viewSpec.icon) view.icon = serializeIcon(viewModel.icon);
            if (viewModel.title !== viewSpec.title) view.title = viewModel.title;
            if (!isEmpty(viewModel.viewState)) view.state = viewModel.viewState;

            ret.push(view);
        } else {
            const {type, width, height, activeItemIndex, content, isClosable} = configItem,
                container = {type, allowRemove: isClosable} as PlainObject;

            if (isFinite(width)) container.width = round(width, 2);
            if (isFinite(height)) container.height = round(height, 2);
            if (isFinite(activeItemIndex)) container.activeItemIndex = activeItemIndex;
            if (isArray(content) && content.length) {
                container.content = convertGLToStateInner(
                    content,
                    contentItem.contentItems,
                    dashContainerModel
                );
            }

            ret.push(container);
        }
    });

    return ret;
}

/**
 * Convert our serializable state into GoldenLayout config
 */
export function convertStateToGL(state = [], dashContainerModel: DashContainerModel) {
    const {viewSpecs, containerRef} = dashContainerModel,
        containerSize = {
            width: containerRef.current?.offsetWidth,
            height: containerRef.current?.offsetHeight
        };

    // Replace any completely empty state with an empty stack, to allow users to add views
    const ret = convertStateToGLInner(state, viewSpecs, containerSize).filter(it => !isNil(it));
    return !ret.length ? [{type: 'stack'}] : ret;
}

export function goldenLayoutConfig(spec: DashContainerViewSpec): any {
    const {id, title, allowRemove} = spec;
    return {
        component: id,
        type: 'react-component',
        title,
        isClosable: allowRemove
    };
}

function convertStateToGLInner(items = [], viewSpecs = [], containerSize, containerItem?) {
    // If placed in a row or column, size its content according to its container
    const dimension = getContainerDimension(containerItem?.type);
    if (dimension) items = sizeItemsToContainer(items, containerSize, dimension);

    // Convert each item into a GoldenLayout config
    return items.map((item: any) => {
        const {type, width, height} = item;

        throwIf(
            type === 'component' || type === 'react-component',
            'Trying to use "component" or "react-component" types. Use type="view" instead.'
        );

        if (type === 'view') {
            const viewSpec = viewSpecs.find(v => v.id === item.id);

            if (!viewSpec) {
                console.debug(
                    `Attempted to load non-existent or omitted view from state: ${item.id}`
                );
                return null;
            }

            const ret = goldenLayoutConfig(viewSpec);

            if (!isNil(item.icon)) ret.icon = item.icon;
            if (!isNil(item.title)) ret.title = item.title;
            if (isPlainObject(item.state)) ret.state = item.state;
            if (isFinite(width)) ret.width = width;
            if (isFinite(height)) ret.height = height;

            return ret;
        } else {
            const itemSize = {...containerSize};

            if (dimension) {
                itemSize[dimension] = relativeSizeToPixels(
                    item[dimension],
                    containerSize[dimension]
                );
            }

            const content = convertStateToGLInner(item.content, viewSpecs, itemSize, item).filter(
                it => !isNil(it)
            );
            if (!content.length && item.allowRemove) return null;

            // Below is a workaround for issue https://github.com/golden-layout/golden-layout/issues/418
            // GoldenLayouts can sometimes export its state with an out-of-bounds `activeItemIndex`.
            // If we encounter this, we overwrite `activeItemIndex` to point to the last item.
            const ret = {...item, content, isClosable: item.allowRemove};
            if (
                type === 'stack' &&
                isFinite(ret.activeItemIndex) &&
                ret.activeItemIndex >= content.length
            ) {
                ret.activeItemIndex = content.length - 1;
            }
            return ret;
        }
    });
}

function sizeItemsToContainer(items, containerSize, dimension) {
    const unsizedItems = [];
    let totalSize = 0;
    items.forEach(item => {
        // If this item is unsized, keep track of it for later
        if (isNil(item[dimension])) {
            unsizedItems.push(item);
            return;
        }

        // GoldenLayout deals exclusively with relative sizes. If the size
        // is defined in pixels, we must convert it to a relative size.
        // We can use the containerSize to do so.
        if (isString(item[dimension]) && item[dimension].endsWith('px')) {
            const intSize = parseInt(item[dimension]);
            item[dimension] = pixelsToRelativeSize(intSize, containerSize[dimension]);
        }

        totalSize += item[dimension];
    });

    // Insert an explicit size on any unsized items, by equally dividing the remaining size
    const remainingSize = 100 - totalSize;
    unsizedItems.forEach(item => {
        item[dimension] = remainingSize / unsizedItems.length;
    });

    return items;
}

function getContainerDimension(type) {
    if (type === 'row') return 'width';
    if (type === 'column') return 'height';
    return null;
}

function pixelsToRelativeSize(pixelSize, containerSize) {
    const borderSize = 3;
    return ((pixelSize + borderSize) / containerSize) * 100;
}

function relativeSizeToPixels(relSize, containerSize) {
    return (containerSize / 100) * relSize;
}
