/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {merge} from 'lodash';

import {rnd} from '@xh/hoist/kit/react-rnd';
import {hoistCmp, uses, ModelPublishMode} from '@xh/hoist/core';
import {Children} from 'react';
import {div, vframe} from '@xh/hoist/cmp/layout';

import {RndModel} from './RndModel';
import {rndHeader} from './RndHeader';
import './RndDialog.scss';


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
    model: uses(RndModel, {publishMode: ModelPublishMode.LIMITED}),
    render({model, className, icon, title, rndOptions, children}) {
        const {
            inPortal,
            resizable,
            draggable,
            showBackgroundMask,
            closeOnOutsideClick,
            isMaximized
        } = model.dm;

        let zIndex = DIALOG_Z_INDEX_BASE,
            baseClass = inPortal ? 'xh-dialog-portal' : 'xh-dialog-container';

        rndOptions = merge({}, rndOptions, {style: {zIndex}});

        const items = [
            maskComp({model, baseClass, zIndex, omit: !showBackgroundMask}),
            clickCaptureComp({model, baseClass, zIndex, omit: !closeOnOutsideClick}),
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
                item: vframe({
                    onKeyDown: model.onKeyDown,
                    tabIndex: 0,
                    ref: model.contentRef,
                    className,
                    items: [
                        rndHeader({icon, title}),
                        ...Children.toArray(children)
                    ]
                })
            })
        ];

        return div({className: baseClass, items});
    }
});


//-------------------
// Helper Components
//-------------------
const maskComp = hoistCmp.factory(
    ({baseClass, zIndex}) => div({className: `${baseClass}__mask`, style: {zIndex}})
);

const clickCaptureComp = hoistCmp.factory(
    ({model, baseClass, zIndex}) => div({
        className: `${baseClass}__click-capture`,
        style: {zIndex},
        onClick: () => model.dm.close()
    })
);