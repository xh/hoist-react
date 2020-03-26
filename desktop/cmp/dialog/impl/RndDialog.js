/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {isNil, merge} from 'lodash';

import {rnd} from '@xh/hoist/kit/react-rnd';
import {hoistCmp, uses} from '@xh/hoist/core';
import {elementFromContent} from '@xh/hoist/utils/react';
import {div, fragment, vframe} from '@xh/hoist/cmp/layout';

import {DialogModel} from '../DialogModel';
import {dialogHeader} from './DialogHeader';

/**
 * @private
 *
 * Main implementation component for Dialog.
 *
 * Wraps an react-rnd based component for showing content and header with draggable affordances
 */
export const rndDialog = hoistCmp.factory({
    model: uses(DialogModel),
    render({model, className, rndOptions = {}, ...props}) {
        const {inPortal, resizable, draggable, showBackgroundMask, closeOnOutsideClick, closeOnEscape} = model;

        const onDragStop = (evt, data) => {
            // ignore drags on close or maximize button in title bar
            if (evt.target.closest('button')) return;

            if (!model.isMaximized) {
                model.setPosition({x: data.x, y: data.y});
            }
            if (rndOptions.onDragStop) rndOptions.onDragStop(evt, data);
        };

        const onResizeStop = (
            evt,
            resizeDirection,
            domEl,
            resizableDelta,
            position
        ) => {
            if (!model.isMaximized) {
                const {offsetWidth: width, offsetHeight: height} = domEl;
                model.setSize({width, height});
                if (isNil(model.controlledX) || isNil(model.controlledY)) {
                    model.centerDialog();
                } else  {
                    model.setPosition(position);
                }
            }
            if (rndOptions.onResizeStop) {
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
            if (evt.key === 'Escape' && closeOnEscape) {
                model.close();
            }
        };

        let zIndex = DialogModel.Z_INDEX_BASE;
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
                onDragStop,
                onResizeStop,
                item: div({
                    onKeyDown,
                    tabIndex: 0,
                    ref: model.dialogWrapperDivRef,
                    className,
                    item: contentContainer(props)
                })
            })
        ];

        return inPortal ? fragment(...items) : div({className: model.baseClass, items});
    }
});

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