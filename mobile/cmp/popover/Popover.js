/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, hoistCmp, HoistModel, useLocalModel} from '@xh/hoist/core';
import {observable, action, makeObservable} from '@xh/hoist/mobx';
import {div, fragment} from '@xh/hoist/cmp/layout';
import {elementFromContent, createObservableRef} from '@xh/hoist/utils/react';
import {isNil, isFunction} from 'lodash';
import {usePopper} from 'react-popper';
import ReactDom from 'react-dom';
import classNames from 'classnames';
import PT from 'prop-types';

import './Popover.scss';

/**
 * Popovers display floating content next to a target element.
 *
 * The API is based on a stripped-down version of Blueprint's Popover component
 * that is used on Desktop. Popover is built on top of the Popper.js library.
 *
 * @see https://popper.js.org/
 */
export const [Popover, popover] = hoistCmp.withFactory({
    displayName: 'Popover',
    model: false,
    className: 'xh-popover',

    render({
        className,
        target,
        content,
        isOpen,
        onInteraction,
        backdrop = false,
        position = 'auto',
        popoverClassName,
        popperOptions
    }) {
        const impl = useLocalModel(() => new LocalModel()),
            popper = usePopper(impl.targetEl, impl.contentEl, {
                placement: impl.menuPositionToPlacement(position),
                strategy: 'fixed',
                modifiers: [
                    {name: 'preventOverflow', options: {padding: 10}}
                ],
                ...popperOptions
            });

        // Respect controlled mode prop
        if (!isNil(isOpen)) {
            impl.setControlledMode(isOpen, onInteraction);
        }

        return div({
            className,
            items: [
                div({
                    ref: impl.targetRef,
                    className: 'xh-popover__target-wrapper',
                    item: elementFromContent(target),
                    onClick: () => impl.toggleOpen()
                }),
                ReactDom.createPortal(
                    fragment({
                        omit: !impl.isOpen,
                        items: [
                            div({
                                ref: impl.contentRef,
                                style: popper?.styles?.popper,
                                className: 'xh-popover__content-wrapper',
                                items: elementFromContent(content, {className: popoverClassName})
                            }),
                            div({
                                className: classNames(
                                    'xh-popover__content-overlay',
                                    backdrop ? 'xh-popover__content-overlay--backdrop' : null
                                ),
                                onClick: () => impl.setIsOpen(false)
                            })
                        ]
                    }),
                    impl.getOrCreatePortalDiv()
                )
            ]
        });
    }
});

Popover.propTypes = {
    /** Component to display inside the popover */
    content: PT.oneOfType([PT.element, PT.object, PT.func]),

    /** The target to which the popover content is attached */
    target: PT.oneOfType([PT.element, PT.object, PT.func]),

    /** Whether the popover is visible. Passing this prop puts the popover in controlled mode */
    isOpen: PT.bool,

    /**
     * Callback invoked in controlled mode when the popover open state _would_ change due to user interaction.
     * Receives (nextOpenState: boolean)
     */
    onInteraction: PT.func,

    /** Whether to display a semi-transparent backdrop behind the popover */
    backdrop: PT.bool,

    /** The position (relative to the target) at which the popover should appear. Default 'auto' */
    position: PT.oneOf([
        'top-left', 'top', 'top-right',
        'right-top', 'right', 'right-bottom',
        'bottom-right', 'bottom', 'bottom-left',
        'left-bottom', 'left', 'left-top',
        'auto'
    ]),

    /** Optional className applied to the popover content. */
    popoverClassName: PT.string,

    /** Escape hatch to provide additional options to the PopperJS implementation */
    popperOptions: PT.object
};

class LocalModel extends HoistModel {

    targetRef = createObservableRef();
    contentRef = createObservableRef();
    @observable isOpen;

    _onInteraction
    _controlledMode = false;

    get targetEl() {
        return this.targetRef.current;
    }

    get contentEl() {
        return this.contentRef.current;
    }

    constructor() {
        super();
        makeObservable(this);

        // Popovers are automatically closed on app route changes to avoid navigating the
        // app underneath the popover in an unsettling way. (i.e. via browser back button)
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.setIsOpen(false)
        });
    }

    @action
    setControlledMode(isOpen, onInteraction) {
        this.isOpen = isOpen;
        this._controlledMode = true;
        if (isFunction(onInteraction)) {
            this._onInteraction = onInteraction;
        }
    }

    @action
    setIsOpen(isOpen) {
        if (this._controlledMode) {
            this._onInteraction?.(isOpen);
        } else {
            this.isOpen = isOpen;
        }
    }

    @action
    toggleOpen() {
        this.setIsOpen(!this.isOpen);
    }

    getOrCreatePortalDiv() {
        const id = 'xh-popover-portal';
        let portal = document.getElementById(id);
        if (!portal) {
            portal = document.createElement('div');
            portal.id = id;
            document.body.appendChild(portal);
        }
        return portal;
    }

    /**
     * Convert a menu position to a Popper.js placement.
     * This allows us to the same position names as desktop, and is inspired
     * by Blueprint's similar implementation:
     * https://github.com/palantir/blueprint/blob/develop/packages/core/src/components/popover/popoverMigrationUtils.ts
     */
    menuPositionToPlacement(position) {
        switch (position) {
            case 'top-left':
                return 'top-start';
            case 'top-right':
                return 'top-end';
            case 'right-top':
                return 'right-start';
            case 'right-bottom':
                return 'right-end';
            case 'bottom-left':
                return 'bottom-start';
            case 'bottom-right':
                return 'bottom-end';
            case 'left-top':
                return 'left-start';
            case 'left-bottom':
                return 'left-end';
            default:
                return position;
        }
    }
}