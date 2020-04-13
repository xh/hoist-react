/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';

import {hoistCmp, uses, ModelPublishMode} from '@xh/hoist/core';
import {rndDialog} from './impl/RndDialog';

import {DialogModel} from './DialogModel';

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

    render(props) {
        return rndDialog(props);
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

