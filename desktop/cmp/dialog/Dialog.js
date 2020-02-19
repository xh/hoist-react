/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useEffect} from 'react';
import PT from 'prop-types';
import ReactDOM from 'react-dom';
import {castArray, isFunction, merge} from 'lodash';

import {rnd} from '@xh/hoist/kit/react-rnd';
import {hoistCmp, uses, useContextModel, ModelPublishMode} from '@xh/hoist/core';
import {useOnMount, useOnUnmount} from '@xh/hoist/utils/react';
import {div, fragment, vframe} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';

import {DialogModel} from './DialogModel';
import {dialogHeader} from './impl/DialogHeader';

import './DialogStyles.scss';


export const [Dialog, dialog] = hoistCmp.withFactory({
    displayName: 'Dialog',
    model: uses(DialogModel, {
        fromContext: false,
        publishMode: ModelPublishMode.LIMITED,
        createDefault: true
    }),
    memo: false,
    className: 'xh-dialog',

    render({model, ...props}) {
        const {isOpen} = props,
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

        useEffect(() => {
            // these need to be called on 2nd render cycle
            // cannot be put into useOnMount
            // todo: explore how to ensure called only once.
            // (may not be necessary to ensure only called once, not seeing any re-renders)
            maybeSetFocus();

            const {width, height, x, y} = props;
            model.positionDialogOnRender({width, height, x, y});
        });

        const {hasMounted} = model;

        if (!isOpen || !hasMounted) {
            document.body.style.overflow = null;
            return null;
        }

        // do we need to store prior overflow setting to be able to reset it when modal closes?
        document.body.style.overflow = 'hidden';

        return ReactDOM.createPortal(
            rndDialog(props),
            model.containerElement
        );

    }
});

Dialog.propTypes = {
    /** True to render the dialog */
    isOpen: PT.bool,

    /** Callback invoked when user interaction triggers onClose call
     * (closeOnOutsideClick overlay, close button, escape key)
     *
     * */
    onClose: PT.func,

    /** An icon placed at the left-side of the dialog's header. */
    icon: PT.element,

    /** Title text added to the dialog's header. */
    title: PT.oneOfType([PT.string, PT.node]),

    /** True to show close button in dialog's header */
    showCloseButton: PT.bool,

    /** True to show a shaded background mask behind dialog. */
    mask: PT.bool,

    /** True to close dialog on click outside of dialog. */
    closeOnOutsideClick: PT.bool,

    /** True to close dialog with escape key (defaults to true) */
    closeOnEscape: PT.bool,

    /** Width of dialog */
    width: PT.number,

    /** Height of dialog */
    height: PT.number,

    /** Left edge position of dialog */
    x: PT.number,

    /** Top edge position of dialog */
    y: PT.number,

    /** Escape hatch to pass any ReactRnD props to ReactRnD comp */
    RnDOptions: PT.object,

    /** CSS style object passed into ReactRnD */
    style: PT.object
};

const rndDialog = hoistCmp.factory({
    render(props) {
        const model = useContextModel(DialogModel),
            {resizable, draggable} = model,
            {width, height, mask, closeOnOutsideClick, RnDOptions = {}, style, onClose, closeOnEscape} = props;

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
            if (isFunction(RnDOptions.onDragStop)) RnDOptions.onDragStop(evt, data);
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
            if (isFunction(RnDOptions.onResizeStop)) {
                RnDOptions.onResizeStop(
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
                        model.handleEscapKey(onClose);
                    }
                    break;
            }
        };

        if (style) RnDOptions.style = style;
        let zIndex = DialogModel.DIALOG_ZINDEX_BASE;
        if (RnDOptions.style?.zIndex) zIndex += RnDOptions.style.zIndex;
        merge(RnDOptions, {style: {zIndex}});

        return fragment(
            mask ? maskComp({zIndex}) : null,
            closeOnOutsideClick ? clickCaptureComp({zIndex, onClose}) : null,
            rnd({
                ref: c =>  model.rndRef = c,
                ...RnDOptions,
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
            onClick: (evt) => model.handleOutsideClick(evt, onClose)
        });
    }
});

const content = hoistCmp.factory({
    render(props) {
        const dialogModel = useContextModel(DialogModel),
            dims = dialogModel.resizable ? {
                width: '100%',
                height: '100%'
            } : {};

        return vframe({
            ...dims,
            items: [
                dialogHeader({dialogModel, ...props}),
                ...castArray(props.children)
            ]
        });
    }
});