/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useEffect} from 'react';
import ReactDOM from 'react-dom';

import {rnd} from '@xh/hoist/kit/react-rnd';
import {hoistCmp, uses, ModelPublishMode} from '@xh/hoist/core';
import {useOnMount, useOnUnmount} from '@xh/hoist/utils/react';
import {div} from '@xh/hoist/cmp/layout';

import {DialogModel} from './DialogModel';

import './DialogStyles.scss';


export const [Dialog, dialog] = hoistCmp.withFactory({
    displayName: 'Panel',
    model: uses(DialogModel, {
        fromContext: true,
        publishMode: ModelPublishMode.LIMITED,
        createDefault: () => new DialogModel({draggable: false, resizable: false})
    }),
    memo: false,
    className: 'xh-dialog',

    render({model, ...props}) {

        const maybeSetFocus = () => {
            // always delay focus manipulation to just before repaint to prevent scroll jumping
            window.requestAnimationFrame(() => {
                const {containerElement: container, isOpen} = model,
                    {activeElement} = document;

                // containerElement may be undefined between component mounting and Portal rendering
                // activeElement may be undefined in some rare cases in IE
                if (container == null || activeElement == null || !isOpen) return;

                const isFocusOutsideModal = !container.contains(activeElement);
                if (isFocusOutsideModal) {
                    /**
                     * @see {@link https://github.com/facebook/react/blob/9fe1031244903e442de179821f1d383a9f2a59f2/packages/react-dom/src/shared/DOMProperty.js#L294}
                     * @see {@link https://github.com/facebook/react/blob/master/packages/react-dom/src/client/ReactDOMHostConfig.js#L379}
                     * for why we do not search for autofocus on dom element: TLDR:  it's not there!
                     */
                    const wrapperElement = container.querySelector('[tabindex]');
                    if (wrapperElement != null) {
                        wrapperElement.focus();
                    }
                }
            });
        };

        useOnMount(() => {
        /**
         * @see {@link{https://reactjs.org/docs/portals.html#event-bubbling-through-portals}
         * @see {@link{https://github.com/palantir/blueprint/blob/develop/packages/core/src/components/portal/portal.tsx}
         */
            model.portalContainer = document.getElementById(model.dialogRootId);

            model.containerElement = document.createElement('div');
            model.portalContainer.appendChild(model.containerElement);
            model.setHasMounted(true);
        });

        useOnUnmount(() => {
            model.portalContainer.removeChild(model.containerElement);
        });

        useEffect(
            maybeSetFocus
        );


        const handleKeyDown = (evt) => {
            switch (evt.key) {
                case 'Escape':
                    handleEscapKey(evt); break;
            }
        };

        const handleEscapKey = () => {
            const {closeOnEscape} = model;
            if (closeOnEscape) model.hide();
        };

        const handleMaskClick = (evt) => {
            const {closeOnMaskClick} = model;
            if (closeOnMaskClick == false) return;
            if (evt.target != model.dialogWrapperDivRef.current) return;

            model.hide();
        };

        const plainDialog = () => {
            return div({
                onKeyDown: (evt) => handleKeyDown(evt),
                onClick: (evt) => handleMaskClick(evt),
                onContextMenu: (evt) => handleMaskClick(evt),
                tabIndex: 0,
                ref: model.dialogWrapperDivRef,
                className: 'xh-dialog-root__fixed',
                item: div({
                    className: 'xh-dialog-root__content',
                    style: {
                        width: model.width,
                        height: model.height
                    },
                    items: props.children
                })
            });
        };


        const rndDialog = () => {
            const {height, width} = model,
                startingHeight = parseFloat(height),
                startingWidth = parseFloat(width),
                {RnDOptions = {}, handle} = model,
                w = window,
                d = document,
                e = d.documentElement,
                g = d.getElementsByTagName('body')[0],
                windowWidth = w.innerWidth || e.clientWidth || g.clientWidth,
                windowHeight = w.innerHeight || e.clientHeight || g.clientHeight;

            RnDOptions.dragHandleClassName = RnDOptions.dragHandleClassName || handle || 'xh-panel-header__title';


            return rnd({
                default: {
                    x: Math.max((windowWidth - startingWidth) / 2, 0),
                    y: Math.max((windowHeight - startingHeight) / 2, 0),
                    width: Math.min(startingWidth, windowWidth),
                    height: Math.min(startingHeight, windowHeight)
                },
                enableResizing: {
                    bottomLeft: true,
                    bottomRight: true,
                    topLeft: true,
                    topRight: true
                },
                bounds: 'body',
                ...RnDOptions,
                item: div({
                    onKeyDown: (evt) => handleKeyDown(evt),
                    tabIndex: '0',
                    ref: model.dialogWrapperDivRef,
                    className: 'react-draggable__container',
                    items: props.children
                })
            });
        };

        const {draggable, isOpen, hasMounted} = model;

        if (isOpen === false || !hasMounted) {
            document.body.style.overflow = null;
            return null;
        }

        // do we need to store prior overflow setting to be able to reset it when modal closes?
        document.body.style.overflow = draggable ? 'hidden' : null;

        return ReactDOM.createPortal(
            draggable ?
                rndDialog() :
                plainDialog(),
            model.containerElement
        );

    }
});