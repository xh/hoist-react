/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {hbox, vbox} from '@xh/hoist/cmp/layout';
import classNames from 'classnames';

import './Toolbar.scss';

/**
 * A toolbar with built-in styling and padding.
 * Child items provided as raw configs will be created as buttons by default.
 */
export const [Toolbar, toolbar] = hoistCmp.withFactory({
    displayName: 'Toolbar',
    model: false, memo: false, observable: false,
    className: 'xh-toolbar',

    render(props) {
        const {vertical, className, ...rest} = props;

        return (vertical ? vbox : hbox)({
            ...rest,
            className: classNames(className, vertical ? 'xh-toolbar--vertical' : null)
        });
    }
});

Toolbar.propTypes = {
    /** Custom classes that will be applied to this component */
    className: PT.string,

    /** Set to true to vertically align the items of this toolbar */
    vertical: PT.bool
};