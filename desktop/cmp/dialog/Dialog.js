/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import React, {Component} from 'react';

import ReactDOM from 'react-dom';
import Draggable from 'react-draggable';

import {bindable} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {createObservableRef} from '@xh/hoist/utils/react';
import {div} from '@xh/hoist/cmp/layout';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import './DialogStyles.scss';


@HoistComponent
@LayoutSupport
export class Dialog extends Component {

    containerElement = null;
    dialogRootId = 'xh-dialog-root';

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
        const {dragOptions, isDraggable, isOpen} = this.props;

        if (isOpen === false || !this.hasMounted)  return null;

        return ReactDOM.createPortal(
            dragOptions || isDraggable ?
                this.makeDraggable() :
                this.makeDialog(),
            this.containerElement
        );
    }

    makeDraggable() {
        const [layoutProps, nonLayoutProps] = splitLayoutProps(this.props),
            {minHeight, height, minWidth, width, ...restLayoutProps} = layoutProps,
            {dragOptions = {}} = nonLayoutProps;

        if (!dragOptions.handle && this.props.children?.type?.displayName == 'Panel') {
            dragOptions.handle = '.xh-panel-header__title';
        }

        return <Draggable
            bounds='body'
            {...dragOptions}
        >
            {
                div({
                    onKeyDown: (evt) => this.handleKeyDown(evt),
                    tabIndex: '0',
                    ref: this.dialogWrapperRef,
                    className: 'xh-dialog-root__draggable xh-dialog-root__content',
                    style: {
                        top: height || minHeight ? 'calc(50vh - ' + parseFloat(height || minHeight)/2 + 'px)' : null,
                        left: width || minWidth ? 'calc(50vw - ' + parseFloat(width || minWidth)/2 + 'px)' : null,
                        ...restLayoutProps
                    },
                    items: this.props.children
                })
            }
        </Draggable>;
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
        const {canEscapeKeyClose, close} = this.props;
        if (canEscapeKeyClose) close(evt);
    }

    handleMaskClick(evt) {
        const {canMaskClickClose, close} = this.props;
        console.log(canMaskClickClose);

        if (canMaskClickClose == false) return;
        if (evt.target != this.dialogWrapperRef.current) return;

        close(evt);
    }
}

export const dialog = elemFactory(Dialog);