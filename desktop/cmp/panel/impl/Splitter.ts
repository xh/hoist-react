/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {creates, elementFactory, hoistCmp} from '@xh/hoist/core';
import classNames from 'classnames';
import {isNumber} from 'lodash';
import {collapseToggleIcon} from './CollapseToggleIcon';
import {DraggerModel} from './dragger/DraggerModel';
import './Splitter.scss';

const htmlButton = elementFactory('button');

/**
 * The edge of a resizable or collapsible panel - a 1px line with a wider, invisible hit area,
 * a hover accent line, and an optional collapse button.
 * @internal
 */
export const splitter = hoistCmp.factory({
    displayName: 'Splitter',
    model: creates(DraggerModel),
    className: 'xh-panel-splitter',

    render({model, className}) {
        const {panelModel, canResize, snapPending} = model,
            {
                vertical,
                collapsed,
                collapsible,
                showSplitter,
                showSplitterCollapseButton,
                isResizing,
                size,
                minSize,
                maxSize
            } = panelModel,
            interactive = canResize || collapsible,
            BASE = 'xh-panel-splitter';

        const cls = classNames(className, `${BASE}--${vertical ? 'ns' : 'ew'}`, {
            [`${BASE}--resizable`]: canResize,
            [`${BASE}--collapsible-only`]: !canResize && collapsible,
            [`${BASE}--no-line`]: !showSplitter,
            [`${BASE}--dragging`]: isResizing,
            [`${BASE}--snap`]: snapPending
        });

        if (!interactive) return div({className: cls, ref: panelModel.splitterRef});

        return div({
            className: cls,
            ref: panelModel.splitterRef,
            tabIndex: 0,
            role: 'separator',
            'aria-orientation': vertical ? 'horizontal' : 'vertical',
            'aria-label': ariaLabel(canResize, collapsible, collapsed),
            ...(canResize && isNumber(size)
                ? {'aria-valuenow': size, 'aria-valuemin': minSize, 'aria-valuemax': maxSize}
                : null),
            onKeyDown: model.onKeyDown,
            items: [
                div({
                    className: `${BASE}__hit`,
                    ref: model.ref,
                    onDoubleClick: model.onDoubleClick
                }),
                div({className: `${BASE}__accent`}),
                htmlButton({
                    className: `${BASE}__btn`,
                    type: 'button',
                    tabIndex: -1,
                    title: collapsed ? 'Expand' : 'Collapse',
                    'aria-label': collapsed ? 'Expand panel' : 'Collapse panel',
                    item: collapseToggleIcon(panelModel),
                    omit: !showSplitterCollapseButton,
                    onClick: e => {
                        e.stopPropagation();
                        panelModel.toggleCollapsed();
                    }
                })
            ]
        });
    }
});

function ariaLabel(canResize: boolean, collapsible: boolean, collapsed: boolean): string {
    if (!canResize) return collapsed ? 'Expand panel' : 'Collapse panel';
    return collapsible ? 'Resize or collapse panel' : 'Resize panel';
}
