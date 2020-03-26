/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {isNil, merge} from 'lodash';

import {rnd} from '@xh/hoist/kit/react-rnd';
import {HoistModel, hoistCmp, uses, useLocalModel} from '@xh/hoist/core';
import {elementFromContent} from '@xh/hoist/utils/react';
import {div, fragment, vframe} from '@xh/hoist/cmp/layout';

import {DialogModel} from '../DialogModel';
import {dialogHeader} from './DialogHeader';

/**
 * The base zIndex that will be used for all dialogs.
 * >4 is required to stay on top of blueprint popopver targets.
 * Cannot be too high or you will cover datepicker and select popups
 */
const DIALOG_Z_INDEX_BASE = 4;


/**
 * @private
 *
 * Main implementation component for Dialog.
 *
 * Wraps content in a react-rnd component for showing in a window with draggable affordances.
 */
export const rndDialog = hoistCmp.factory({
    model: uses(DialogModel),
    render({model, className, rndOptions = {}, ...props}) {
        const {inPortal, resizable, draggable, showBackgroundMask, closeOnOutsideClick} = model,
            impl = useLocalModel(LocalModel);
        impl.model = model;

        let zIndex = DIALOG_Z_INDEX_BASE;
        if (rndOptions.style?.zIndex) zIndex += rndOptions.style.zIndex;
        merge(rndOptions, {style: {zIndex}});

        const items = [
            showBackgroundMask ? maskComp({zIndex}) : null,
            closeOnOutsideClick ? clickCaptureComp({zIndex}) : null,
            rnd({
                ref: c => model.rndRef = c,
                ...rndOptions,
                disableDragging: !draggable,
                enableResizing: model.isMaximized ? null : {
                    bottom: resizable,
                    bottomLeft: resizable,
                    bottomRight: resizable,
                    left: resizable,
                    right: resizable,
                    top: resizable,
                    topLeft: resizable,
                    topRight: resizable
                },
                bounds: inPortal ? 'body' : 'parent',
                dragHandleClassName: 'xh-dialog__header',
                onDragStop: impl.onDragStop,
                onResizeStop: impl.onResizeStop,
                item: div({
                    onKeyDown: impl.onKeyDown,
                    tabIndex: 0,
                    ref: model.dialogWrapperDivRef,
                    className,
                    item: contentContainer(props)
                })
            })
        ];

        return inPortal ? fragment(items) : div({className: model.baseClass, items});
    }
});

@HoistModel
class LocalModel {

    model;

    onDragStop = (evt, data) => {
        const {model} = this;

        if (evt.target.closest('button')) return;    // ignore drags on close or maximize button

        if (!model.isMaximized) {
            model.setPosition({x: data.x, y: data.y});
        }
    };

    onResizeStop = (
        evt,
        resizeDirection,
        domEl,
        resizableDelta,
        position
    ) => {
        const {model} = this;
        if (!model.isMaximized) {
            model.setSize({width: domEl.offsetWidth, height: domEl.offsetHeight});
            if (isNil(model.controlledX) || isNil(model.controlledY)) {
                model.centerDialog();
            } else  {
                model.setPosition(position);
            }
        }
    };

    onKeyDown = (evt) => {
        const {model} = this;
        if (evt.key === 'Escape' && model.closeOnEscape) {
            model.close();
        }
    };
}


//-------------------
// Helper Components
//-------------------
const maskComp = hoistCmp.factory(
    ({model, zIndex}) => div({className: `${model.baseClass}__mask`, style: {zIndex}})
);

const clickCaptureComp = hoistCmp.factory(
    ({model, zIndex}) => div({
        className: `${model.baseClass}__click-capture`,
        style: {zIndex},
        ref: model.clickCaptureCompRef,
        onClick: (evt) => model.handleOutsideClick(evt)
    })
);

const contentContainer = hoistCmp.factory({
    render({model, ...props}) {
        const {controlledWidth, controlledHeight, resizable, content} = model;

        return vframe({
            width: resizable ? '100%' : controlledWidth,
            height: resizable ? '100%' : controlledHeight,
            items: [
                dialogHeader(props),
                elementFromContent(content)
            ]
        });
    }
});