/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useEffect} from 'react';
import PT from 'prop-types';
import ReactDOM from 'react-dom';
import {isFunction, merge} from 'lodash';

import {rnd} from '@xh/hoist/kit/react-rnd';
import {hoistCmp, uses, useContextModel, ModelPublishMode} from '@xh/hoist/core';
import {elementFromContent, useOnUnmount} from '@xh/hoist/utils/react';
import {div, fragment, vframe} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';

import {DialogModel} from './DialogModel';
import {dialogHeader} from './impl/DialogHeader';

import './DialogStyles.scss';


export const [Dialog, dialog] = hoistCmp.withFactory({
    displayName: 'Dialog',
    model: uses(DialogModel, {
        fromContext: true,
        publishMode: ModelPublishMode.LIMITED
    }),
    memo: false,
    className: 'xh-dialog',

    render({model, ...props}) {
        const {isOpen, hasPortal} = model,
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

            const {width, height, x, y} = model;
            model.positionDialogOnRender({width, height, x, y});
        });

        if (!isOpen || !hasPortal) {
            return null;
        }

        return ReactDOM.createPortal(
            rndDialog(props),
            model.containerElement
        );

    }
});

Dialog.propTypes = {
    /** An icon placed at the left-side of the dialog's header. */
    icon: PT.element,

    /** Title text added to the dialog's header. */
    title: PT.oneOfType([PT.string, PT.node]),

    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(DialogModel), PT.object]),

    /** Escape hatch to pass any props to underlying react-rnd API */
    rndOptions: PT.object
};

const rndDialog = hoistCmp.factory({
    render(props) {
        const model = useContextModel(DialogModel),
            {resizable, draggable, width, height, showBackgroundMask, closeOnOutsideClick, closeOnEscape} = model,
            {rndOptions = {}, onClose } = props;

        throwIf(
            resizable && (!width || !height),
            'Resizable dialogs must also have width and height props set.'
        );

        const onDragStop = (evt, data) => {
            // ignore drags on close or maximize button in title bar
            if (evt.target.closest('button')) return;

            if (!model.isMaximizedState) {
                model.setPositionState({x: data.x, y: data.y});
            }
            if (isFunction(rndOptions.onDragStop)) rndOptions.onDragStop(evt, data);
        };

        const onResizeStop = (
            evt,
            resizeDirection,
            domEl,
            resizableDelta,
            position
        ) => {
            if (!model.isMaximizedState) {
                const {
                    offsetWidth: width,
                    offsetHeight: height
                } = domEl;
                model.setSizeState({width, height});
                model.setPositionState(position);
            }
            if (isFunction(rndOptions.onResizeStop)) {
                rndOptions.onResizeStop(
                    evt,
                    resizeDirection,
                    domEl,
                    resizableDelta,
                    position
                );
            }
        };

        const onKeyDown = (evt) => {
            switch (evt.key) {
                case 'Escape':
                    if (closeOnEscape !== false) {
                        model.handleEscapKey();
                    }
                    break;
            }
        };

        let zIndex = DialogModel.Z_INDEX_BASE;
        if (rndOptions.style?.zIndex) zIndex += rndOptions.style.zIndex;
        merge(rndOptions, {style: {zIndex}});

        return fragment(
            showBackgroundMask ? maskComp({zIndex}) : null,
            closeOnOutsideClick ? clickCaptureComp({zIndex, onClose}) : null,
            rnd({
                ref: c =>  model.rndRef = c,
                ...rndOptions,
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
                dragHandleClassName: 'xh-dialog__header',
                onDragStop,
                onResizeStop,
                item: div({
                    onKeyDown,
                    tabIndex: 0,
                    ref: model.dialogWrapperDivRef,
                    className: props.className,
                    item: content(props)
                })
            })
        );
    }
});

const maskComp = hoistCmp.factory(
    ({zIndex}) => div({className: 'xh-dialog-root__mask', style: {zIndex}})
);

const clickCaptureComp = hoistCmp.factory({
    render({zIndex, onClose}) {
        const model = useContextModel(DialogModel);

        return div({
            className: 'xh-dialog-root__click-capture',
            style: {zIndex},
            ref: model.clickCaptureCompRef,
            onClick: (evt) => model.handleOutsideClick(evt)
        });
    }
});

const content = hoistCmp.factory({
    render(props) {
        const dialogModel = useContextModel(DialogModel),
            {width, height} = dialogModel,
            dims = dialogModel.resizable ? {
                width: '100%',
                height: '100%'
            } : {
                width,
                height
            };

        return vframe({
            ...dims,
            items: [
                dialogHeader({dialogModel, ...props}),
                elementFromContent(dialogModel.content)
            ]
        });
    }
});