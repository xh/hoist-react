/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, fragment} from '@xh/hoist/cmp/layout';
import {
    Content,
    hoistCmp,
    HoistModel,
    HoistProps,
    PlainObject,
    useLocalModel,
    XH
} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {createObservableRef, elementFromContent} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isFunction, isNil} from 'lodash';
import {ReactPortal} from 'react';
import ReactDom from 'react-dom';
import {usePopper} from 'react-popper';

import './Popover.scss';

export interface PopoverProps extends HoistProps {
    /** Component to display inside the popover */
    content: Content;

    /** Whether the popover is visible. Passing this prop puts the popover in controlled mode */
    isOpen?: boolean;

    /**
     * Callback invoked in controlled mode when the popover open state _would_ change due to
     * user interaction.
     */
    onInteraction?: (nextOpenState: boolean) => void;

    /** True to disable user interaction */
    disabled?: boolean;

    /** Whether to display a semi-transparent backdrop behind the popover */
    backdrop?: boolean;

    /** The position (relative to the target) at which the popover should appear. Default 'auto' */
    position?:
        | 'top-left'
        | 'top'
        | 'top-right'
        | 'right-top'
        | 'right'
        | 'right-bottom'
        | 'bottom-right'
        | 'bottom'
        | 'bottom-left'
        | 'left-bottom'
        | 'left'
        | 'left-top'
        | 'auto';

    /** Optional className applied to the popover content wrapper. */
    popoverClassName?: string;

    /** Escape hatch to provide additional options to the PopperJS implementation */
    popperOptions?: PlainObject;
}

/**
 * Popovers display floating content next to a target element.
 *
 * The API is based on a stripped-down version of Blueprint's Popover component
 * that is used on Desktop. Popover is built on top of the Popper.js library.
 *
 * @see https://popper.js.org/
 */
export const [Popover, popover] = hoistCmp.withFactory<PopoverProps>({
    displayName: 'Popover',
    className: 'xh-popover',

    render({
        children,
        className,
        content,
        disabled = false,
        backdrop = false,
        position = 'auto',
        popoverClassName,
        popperOptions
    }) {
        const impl = useLocalModel(PopoverModel),
            popper = usePopper(impl.targetEl, impl.contentEl, {
                placement: impl.menuPositionToPlacement(position),
                strategy: 'fixed',
                modifiers: [
                    {
                        name: 'preventOverflow',
                        options: {
                            padding: 10,
                            boundary: 'viewport'
                        } as any
                    }
                ],
                ...popperOptions
            });

        return div({
            className,
            items: [
                div({
                    ref: impl.targetRef,
                    className: 'xh-popover__target-wrapper',
                    items: children,
                    onClick: () => {
                        if (disabled) return;
                        impl.toggleOpen();
                    }
                }),
                ReactDom.createPortal(
                    fragment({
                        omit: !impl.isOpen,
                        items: [
                            div({
                                ref: impl.contentRef,
                                style: popper?.styles?.popper,
                                className: classNames(
                                    'xh-popover__content-wrapper',
                                    popoverClassName
                                ),
                                items: elementFromContent(content)
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
                ) as ReactPortal
            ]
        });
    }
});

class PopoverModel extends HoistModel {
    override xhImpl = true;

    targetRef = createObservableRef<HTMLElement>();
    contentRef = createObservableRef<HTMLElement>();
    @observable isOpen;

    _onInteraction;
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
    }

    override onLinked() {
        // Popovers are automatically closed on app route changes to avoid navigating the
        // app underneath the popover in an unsettling way. (i.e. via browser back button)
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.setIsOpen(false)
        });

        this.addReaction({
            track: () => this.componentProps.isOpen,
            run: isOpen => {
                if (!isNil(isOpen)) {
                    this.setControlledMode(isOpen);
                }
            },
            fireImmediately: true
        });
    }

    @action
    setControlledMode(isOpen) {
        this.isOpen = isOpen;
        this._controlledMode = true;
        const {onInteraction} = this.componentProps;
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
