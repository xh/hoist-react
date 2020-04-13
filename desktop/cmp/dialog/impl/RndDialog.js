/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {merge} from 'lodash';

import {rnd} from '@xh/hoist/kit/react-rnd';
import {hoistCmp, uses, useLocalModel, RenderMode} from '@xh/hoist/core';
import {Children, useRef} from 'react';
import {div, vframe} from '@xh/hoist/cmp/layout';
import ReactDOM from 'react-dom';

import {DialogModel} from '../DialogModel';
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
    model: uses(DialogModel),
    render({model, className, icon, title, rndOptions, children}) {
        const rndModel = useLocalModel(() => new RndModel(model));

        let {isOpen, renderMode} = model,
            wasOpen = useRef(false);
        if (!wasOpen.current && isOpen) wasOpen.current = true;
        if (
            !isOpen &&
            (
                (renderMode === RenderMode.UNMOUNT_ON_HIDE) ||
                (renderMode === RenderMode.LAZY && !wasOpen.current)
            )
        ) {
            return null;
        }

        const {
            inPortal,
            resizable,
            draggable,
            showBackgroundMask,
            closeOnOutsideClick,
            isMaximized
        } = model;

        let zIndex = DIALOG_Z_INDEX_BASE,
            baseClass = inPortal ? 'xh-dialog-portal' : 'xh-dialog-container';

        rndOptions = merge({}, rndOptions, {style: {zIndex}});

        const ret = div({
            style: {display: isOpen ? 'flex' : 'none'},
            className: baseClass,
            items: [
                maskComp({rndModel, baseClass, zIndex, omit: !showBackgroundMask}),
                clickCaptureComp({rndModel, baseClass, zIndex, omit: !closeOnOutsideClick}),
                rnd({
                    ref: rndModel.rndRef,
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
                    onDragStop: rndModel.onDragStop,
                    onResizeStop: rndModel.onResizeStop,
                    item: div({
                        onKeyDown: rndModel.onKeyDown,
                        tabIndex: 0,
                        className,
                        item: vframe({
                            width: '100%',
                            height: '100%',
                            items: [
                                rndHeader({icon, title}),
                                ...Children.toArray(children)
                            ]
                        })
                    })
                })
            ]
        });

        return inPortal ? ReactDOM.createPortal(ret, rndModel.portalEl) : ret;
    }
});


//-------------------
// Helper Components
//-------------------
const maskComp = hoistCmp.factory(
    ({baseClass, zIndex}) => div({className: `${baseClass}__mask`, style: {zIndex}})
);

const clickCaptureComp = hoistCmp.factory(
    ({rndModel, baseClass, zIndex}) => div({
        className: `${baseClass}__click-capture`,
        style: {zIndex},
        onClick: rndModel.onCloseClick
    })
);