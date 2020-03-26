/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {useEffect} from 'react';
import PT from 'prop-types';
import ReactDOM from 'react-dom';

import {hoistCmp, uses, ModelPublishMode} from '@xh/hoist/core';
import {useOnUnmount, useOnResize} from '@xh/hoist/utils/react';
import {rndDialog} from './impl/RndDialog';

import {DialogModel} from './DialogModel';

import './DialogStyles.scss';

/**
 * Component for showing content in a window.
 *
 * See DialogModel for the main API for specifying and controlling this component.
 */
export const [Dialog, dialog] = hoistCmp.withFactory({
    displayName: 'Dialog',
    model: uses(DialogModel, {publishMode: ModelPublishMode.LIMITED}),
    memo: false,
    className: 'xh-dialog',

    render({model, ...props}) {
        const {isOpen, hasPortal, inPortal} = model,
            maybeSetFocus = () => {
            // always delay focus manipulation to just before repaint to prevent scroll jumping
                window.requestAnimationFrame(() => {
                    const {containerElement: container} = model,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useEffect(() => model.togglePortal(), [isOpen]);
        useOnUnmount(() => model.removePortal());

        useEffect(() => {
            // these need to be called on 2nd render cycle
            // cannot be put into useOnMount
            // todo: explore how to ensure called only once.
            // (may not be necessary to ensure only called once, not seeing any re-renders)
            maybeSetFocus();
            model.positionDialogOnRender();
        });

        useOnResize(() => model.onParentResize(), {ref: {current: document.body}});

        if (!isOpen || (inPortal && !hasPortal)) {
            return null;
        }

        return inPortal ?
            ReactDOM.createPortal(rndDialog(props), model.containerElement) :
            rndDialog(props);
    }
});

Dialog.propTypes = {
    /** An icon to be shown in the dialog's header. */
    icon: PT.element,

    /** Title to be shown in the dialog's header. */
    title: PT.oneOfType([PT.string, PT.node]),

    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(DialogModel), PT.object]),

    /** Escape hatch to pass any props to underlying react-rnd API */
    rndOptions: PT.object
};

