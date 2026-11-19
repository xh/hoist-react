/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ToastModel} from '@xh/hoist/appcontainer/ToastModel';
import {ToastSourceModel} from '@xh/hoist/appcontainer/ToastSourceModel';
import {div, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {logWarn} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isElement} from 'lodash';
import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {toast} from './Toast';

/**
 * Renders the open toasts. Toasts sharing a container and position stack together, newest
 * nearest the edge they are shown along. Escape dismisses all open toasts, unless a dialog, popover
 * or other layer consumed it.
 * @internal
 */
export const toastSource = hoistCmp.factory<ToastSourceModel>({
    displayName: 'ToastSource',
    model: uses(ToastSourceModel),

    render({model}) {
        useEffect(() => {
            const onKeyDown = (e: KeyboardEvent) => {
                if (e.key !== 'Escape' || e.defaultPrevented) return;
                model.toastModels.forEach(it => {
                    if (it.isOpen) it.dismiss();
                });
            };
            window.addEventListener('keydown', onKeyDown);
            return () => window.removeEventListener('keydown', onKeyDown);
        }, [model]);

        const stacks = new Map<HTMLElement, Map<string, ToastModel[]>>();
        model.toastModels.forEach(it => {
            if (!it.isOpen) return;
            const container = containerFor(it),
                byPosition = stacks.get(container) ?? new Map();
            stacks.set(container, byPosition);
            byPosition.set(it.position, [it, ...(byPosition.get(it.position) ?? [])]);
        });

        const portals = [];
        stacks.forEach((byPosition, container) => {
            byPosition.forEach((toasts, position) => {
                const key = `${containerKey(container)}-${position}`;
                portals.push(createPortal(toastStack(toasts, position, container), container, key));
            });
        });
        return fragment(portals);
    }
});

//------------------------
// Implementation
//------------------------
function toastStack(toasts: ToastModel[], position: string, container: HTMLElement) {
    const isAnchored = container !== document.body,
        edges = position.split('-');

    return div({
        className: classNames(
            'xh-toast-container',
            `xh-toast-container--${position}`,
            'bp6-toast-container',
            edges.map(it => `bp6-toast-container-${it}`),
            isAnchored
                ? ['xh-toast-container--anchored', 'bp6-toast-container-inline']
                : 'bp6-toast-container-in-portal'
        ),
        children: toasts.map(model => toast({model, key: model.xhId}))
    });
}

// Stable React keys for containers, so a stack keeps its DOM as toasts come and go.
const containerKeys = new WeakMap<HTMLElement, number>();
let nextContainerKey = 0;

function containerKey(container: HTMLElement): number {
    if (!containerKeys.has(container)) containerKeys.set(container, nextContainerKey++);
    return containerKeys.get(container);
}

function containerFor(model: ToastModel): HTMLElement {
    const {containerRef} = model;
    if (containerRef && !isElement(containerRef)) {
        logWarn('Ignoring invalid containerRef for Toast - must be a DOM element', 'ToastSource');
        return document.body;
    }
    return containerRef ?? document.body;
}
