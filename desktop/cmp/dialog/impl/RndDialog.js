/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {merge} from 'lodash';

import {rnd} from '@xh/hoist/kit/react-rnd';
import {hoistCmp, uses} from '@xh/hoist/core';
import {elementFromContent} from '@xh/hoist/utils/react';
import {div, fragment, vframe} from '@xh/hoist/cmp/layout';

import {RndModel} from './RndModel';
import {rndHeader} from './RndHeader';

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
    model: uses(RndModel),
    render({model, className, rndOptions = {}, ...props}) {
        const {
            inPortal,
            resizable,
            draggable,
            showBackgroundMask,
            closeOnOutsideClick,
            isMaximized
        } = model.dm;

        let zIndex = DIALOG_Z_INDEX_BASE;
        if (rndOptions.style?.zIndex) zIndex += rndOptions.style.zIndex;
        merge(rndOptions, {style: {zIndex}});

        const items = [
            showBackgroundMask ? maskComp({zIndex}) : null,
            closeOnOutsideClick ? clickCaptureComp({zIndex}) : null,
            rnd({
                ref: model.rndRef,
                ...rndOptions,
                disableDragging: !draggable,
                enableResizing: isMaximized ? null : {
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
                onDragStop: model.onDragStop,
                onResizeStop: model.onResizeStop,
                item: div({
                    onKeyDown: model.onKeyDown,
                    tabIndex: 0,
                    ref: model.wrapperDivRef,
                    className,
                    item: contentContainer(props)
                })
            })
        ];

        return inPortal ? fragment(items) : div({className: model.baseClass, items});
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
        ref: model.clickCaptureRef,
        onClick: (evt) => model.handleOutsideClick(evt)
    })
);

const contentContainer = hoistCmp.factory({
    render({model, ...props}) {
        const {width, height, resizable, content} = model.dm;

        return vframe({
            width: resizable ? '100%' : width,
            height: resizable ? '100%' : height,
            items: [
                rndHeader(props),
                elementFromContent(content)
            ]
        });
    }
});