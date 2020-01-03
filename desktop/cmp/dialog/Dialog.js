/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import {Rnd} from 'react-rnd';

import { bindable } from '@xh/hoist/mobx';
import { elemFactory, HoistComponent, LayoutSupport } from '@xh/hoist/core';
import { createObservableRef } from '@xh/hoist/utils/react';
import { div } from '@xh/hoist/cmp/layout';
import { splitLayoutProps } from '@xh/hoist/utils/react';

import './DialogStyles.scss';


@HoistComponent
@LayoutSupport
export class Dialog extends Component {

    containerElement = null;
    dialogRootId = 'xh-dialog-root';
    isDraggable = false;

    dialogWrapperRef = createObservableRef();

    @bindable.ref hasMounted = false;

    constructor(props) {
        super(props);
        this.dialogRoot = document.getElementById(this.dialogRootId);
        if (!this.dialogRoot) {
            this.dialogRoot = document.createElement('div');
            this.dialogRoot.setAttribute('id', this.dialogRootId);
            document.body.appendChild(this.dialogRoot);
        }

        this.containerElement = document.createElement('div');
    }

    componentDidMount() {
        /**
         * @see {@link{https://reactjs.org/docs/portals.html#event-bubbling-through-portals}
         * @see {@link{https://github.com/palantir/blueprint/blob/develop/packages/core/src/components/portal/portal.tsx}
         */
        this.dialogRoot.appendChild(this.containerElement);
        this.setHasMounted(true);
    }

    componentDidUpdate() {
        this.maybeSetFocus();
    }

    componentWillUnmount() {
        this.dialogRoot.removeChild(this.containerElement);
    }

    render() {
        const { dragOptions, isDraggable, isOpen } = this.props;
        this.isDraggable = dragOptions || isDraggable;

        if (isOpen === false || !this.hasMounted) {
            document.body.style.overflow = null;
            return null;
        }

        // do we need to store prior overflow setting to be able to reset it when modal closes?
        document.body.style.overflow = this.isDraggable ? 'hidden' : null;

        return ReactDOM.createPortal(
            this.isDraggable ?
                this.makeDraggable() :
                this.makeDialog(),
            this.containerElement
        );
    }

    makeDraggable() {
        const [layoutProps, nonLayoutProps] = splitLayoutProps(this.props),
            { minHeight, height, minWidth, width, ...restLayoutProps } = layoutProps,
            startingHeight = parseFloat(height || minHeight),
            startingWidth = parseFloat(width || minWidth),
            { RnDOptions = {}, handle} = nonLayoutProps,
            w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            windowWidth = w.innerWidth || e.clientWidth || g.clientWidth,
            windowHeight = w.innerHeight || e.clientHeight || g.clientHeight;

        RnDOptions.dragHandleClassName = RnDOptions.dragHandleClassName || handle || 'xh-panel-header__title';


        return <Rnd
            default={{
                x: Math.max((windowWidth - startingWidth) / 2, 0),
                y: Math.max((windowHeight - startingHeight) / 2, 0),
                width: Math.min(startingWidth, windowWidth),
                height: Math.min(startingHeight, windowHeight)
            }}
            enableResizing={{
                bottomLeft: true,
                bottomRight: true,
                topLeft: true,
                topRight: true
            }}
            bounds='body'
            {...RnDOptions}
        >
            {
                div({
                    onKeyDown: (evt) => this.handleKeyDown(evt),
                    tabIndex: '0',
                    ref: this.dialogWrapperRef,
                    className: 'react-draggable__container',
                    style: {
                        ...restLayoutProps
                    },
                    items: this.props.children
                })
            }
        </Rnd>;
    }

    makeDialog() {
        const [layoutProps] = splitLayoutProps(this.props);

        return div({
            onKeyDown: (evt) => this.handleKeyDown(evt),
            onClick: (evt) => this.handleMaskClick(evt),
            onContextMenu: (evt) => this.handleMaskClick(evt),
            tabIndex: '0',
            ref: this.dialogWrapperRef,
            className: 'xh-dialog-root__fixed',
            item: div({
                className: 'xh-dialog-root__content',
                style: {
                    ...layoutProps
                },
                items: this.props.children
            })
        });
    }

    maybeSetFocus() {
        // always delay focus manipulation to just before repaint to prevent scroll jumping
        window.requestAnimationFrame(() => {
            // containerElement may be undefined between component mounting and Portal rendering
            // activeElement may be undefined in some rare cases in IE
            if (this.containerElement == null || document.activeElement == null || !this.props.isOpen) {
                return;
            }

            const isFocusOutsideModal = !this.containerElement.contains(document.activeElement);
            if (isFocusOutsideModal) {
                /**
                     * @see {@link https://github.com/facebook/react/blob/9fe1031244903e442de179821f1d383a9f2a59f2/packages/react-dom/src/shared/DOMProperty.js#L294}
                     * @see {@link https://github.com/facebook/react/blob/master/packages/react-dom/src/client/ReactDOMHostConfig.js#L379}
                     * for why we do not search for autofocus on dom element: TLDR:  it's not there!
                     */
                const wrapperElement = this.containerElement.querySelector('[tabindex]');
                if (wrapperElement != null) {
                    wrapperElement.focus();
                }
            }
        });
    }

    handleKeyDown(evt) {
        switch (evt.key) {
            case 'Escape':
                this.handleEscapKey(evt); break;
        }
    }

    handleEscapKey(evt) {
        const { canEscapeKeyClose, close } = this.props;
        if (canEscapeKeyClose) close(evt);
    }

    handleMaskClick(evt) {
        const { canMaskClickClose, close } = this.props;
        if (canMaskClickClose == false) return;
        if (evt.target != this.dialogWrapperRef.current) return;

        close(evt);
    }
}

export const dialog = elemFactory(Dialog);