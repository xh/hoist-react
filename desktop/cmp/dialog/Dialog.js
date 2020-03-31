/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {useEffect} from 'react';
import PT from 'prop-types';
import ReactDOM from 'react-dom';

import {hoistCmp, uses, useLocalModel, ModelPublishMode} from '@xh/hoist/core';
import {rndDialog} from './impl/RndDialog';
import {RndModel} from './impl/RndModel';

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
        const rndModel = useLocalModel(() => new RndModel(model)),
            {isOpen, portalEl, inPortal} = rndModel;

        useEffect(() => rndModel.maintainPortal(), [rndModel, isOpen]);

        if (!isOpen || (inPortal && !portalEl)) {
            return null;
        }

        const ret = rndDialog({model: rndModel, ...props});
        return inPortal ? ReactDOM.createPortal(ret, portalEl) : ret;
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

