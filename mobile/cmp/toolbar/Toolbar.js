/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import classNames from 'classnames';
import PT from 'prop-types';
import './Toolbar.scss';

/**
 * A toolbar with built-in styling and padding.
 */
export const [Toolbar, toolbar] = hoistCmp.withFactory({
    displayName: 'Toolbar',
    className: 'xh-toolbar',
    model: false, memo: false, observer: false,

    render({className, vertical, ...rest}) {
        return (vertical ? vbox : hbox)({
            className: classNames(className, vertical ? 'xh-toolbar--vertical' : null),
            ...rest
        });
    }

});
Toolbar.propTypes = {
    /** Custom classes that will be applied to this component */
    className: PT.string,

    /** Set to true to vertically align the items of this toolbar */
    vertical: PT.bool
};