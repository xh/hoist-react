/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import Draggable from 'react-draggable';
// import {isNil} from 'lodash';

// import {action, bindable} from '@xh/hoist/mobx';
import {elemFactory} from '@xh/hoist/core';
import {createObservableRef} from '@xh/hoist/utils/react';

import {div} from '@xh/hoist/cmp/layout';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import './DialogStyles.scss';


// see https://reactjs.org/docs/portals.html#event-bubbling-through-portals
// and
// https://github.com/palantir/blueprint/blob/develop/packages/core/src/components/portal/portal.tsx

export class Dialog extends Component {

    dialogRootId = 'xh-dialog-root';

    dialogWrapperRef = createObservableRef();

    constructor(props) {
        super(props);
        this.dialogRoot = document.getElementById(this.dialogRootId);
        if (!this.dialogRoot) {
            this.dialogRoot = document.createElement('div');
            this.dialogRoot.setAttribute('id', this.dialogRootId);
            document.body.appendChild(this.dialogRoot);
        }

        this.el = document.createElement('div');
    }

    componentDidMount() {
        // The portal element is inserted in the DOM tree after
        // the Modal's children are mounted, meaning that children
        // will be mounted on a detached DOM node. If a child
        // component requires to be attached to the DOM tree
        // immediately when mounted, for example to measure a
        // DOM node, or uses 'autoFocus' in a descendant, add
        // state to Modal and only render the children when Modal
        // is inserted in the DOM tree.
        this.dialogRoot.appendChild(this.el);

    }

    componentDidUpdate() {
        this.dialogWrapperRef.current?.focus();
    }

    componentWillUnmount() {
        this.dialogRoot.removeChild(this.el);
    }

    render() {
        const {dragOptions, isDraggable, isOpen} = this.props;

        if (isOpen === false)  return null;

        return ReactDOM.createPortal(
            dragOptions || isDraggable ?
                this.makeDraggable() :
                this.makeDialog(),
            this.el
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
        close(evt);
    }
}

export const dialog = elemFactory(Dialog);