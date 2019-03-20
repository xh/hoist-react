/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistComponent, useClassName} from '@xh/hoist/core';
import {hbox, vbox} from '@xh/hoist/cmp/layout';

import './Toolbar.scss';

/**
 * A toolbar with built-in styling and padding.
 * Child items provided as raw configs will be created as buttons by default.
 */
export const [Toolbar, toolbar] = hoistComponent(function Toolbar(props) {
    const {vertical, ...rest} = props;

    return (vertical ? vbox : hbox)({
        ...rest,
        className: useClassName('xh-toolbar', props, vertical ? 'xh-toolbar--vertical' : null)
    });
});

Toolbar.propTypes = {
    /** Custom classes that will be applied to this component */
    className: PT.string,

    /** Set to true to vertically align the items of this toolbar */
    vertical: PT.bool
};
