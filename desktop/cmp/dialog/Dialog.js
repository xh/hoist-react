/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useEffect} from 'react';
import PT from 'prop-types';
import ReactDOM from 'react-dom';
import {castArray} from 'lodash';

import {rnd} from '@xh/hoist/kit/react-rnd';
import {hoistCmp, uses, ModelPublishMode} from '@xh/hoist/core';
import {useOnMount, useOnUnmount} from '@xh/hoist/utils/react';
import {div, vframe} from '@xh/hoist/cmp/layout';

import {DialogModel} from './DialogModel';
import {dialogHeader} from './impl/DialogHeader';

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

        const {draggable, resizable, isOpen, hasMounted} = model,
            isRnd = draggable || resizable;

        if (isOpen === false || !hasMounted) {
            document.body.style.overflow = null;
            return null;
        }

        // do we need to store prior overflow setting to be able to reset it when modal closes?
        document.body.style.overflow = isRnd ? 'hidden' : null;
        console.log(props);

        return ReactDOM.createPortal(
            isRnd ?
                rndDialog({model, props}) :
                plainDialog({model, props}),
            model.containerElement
        );

    }
});


const plainDialog = hoistCmp.factory(
    ({model: dialogModel, props}) => div({
        onKeyDown: (evt) => dialogModel.handleKeyDown(evt),
        onClick: (evt) => dialogModel.handleMaskClick(evt),
        onContextMenu: (evt) => dialogModel.handleMaskClick(evt),
        tabIndex: 0,
        ref: dialogModel.dialogWrapperDivRef,
        className: 'xh-dialog-root__fixed',
        item: div({
            className: 'xh-dialog-root__content',
            style: {
                width: dialogModel.width,
                height: dialogModel.height
            },
            item: content(props)
        })
    })
);

const rndDialog = hoistCmp.factory(
    ({model: dialogModel, props}) => {
        const {height, width, resizable, draggable, RnDOptions = {}} = dialogModel,
            w = window, d = document, e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            windowWidth = w.innerWidth || e.clientWidth || g.clientWidth,
            windowHeight = w.innerHeight || e.clientHeight || g.clientHeight;

        RnDOptions.dragHandleClassName = 'xh-dialog-header__title';


        return rnd({
            default: {
                x: Math.max((windowWidth - width) / 2, 0),
                y: Math.max((windowHeight - height) / 2, 0),
                width: Math.min(width, windowWidth),
                height: Math.min(height, windowHeight)
            },
            disableDragging: !draggable,
            enableResizing: {
                bottom: resizable,
                bottomLeft: resizable,
                bottomRight: resizable,
                left: resizable,
                right: resizable,
                top: resizable,
                topLeft: resizable,
                topRight: resizable
            },
            bounds: 'body',
            ...RnDOptions,
            item: div({
                onKeyDown: (evt) => dialogModel.handleKeyDown(evt),
                tabIndex: 0,
                ref: dialogModel.dialogWrapperDivRef,
                className: 'react-draggable__container',
                item: content(props)
            })
        });
    }
);

const content = hoistCmp.factory(
    ({icon, title, children}) => vframe({
        items: [
            dialogHeader({icon, title}),
            ...castArray(children)
        ]
    })
);


Dialog.propTypes = {
    /** An icon placed at the left-side of the dialog's header. */
    icon: PT.element,

    /** Title text added to the dialog's header. */
    title: PT.oneOfType([PT.string, PT.node])
};