/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import PT from 'prop-types';
import './Label.scss';

/**
 * A simple label for a form.
 */
export const [Label, label] = hoistCmp.withFactory({
    displayName: 'Label',
    className: 'xh-input-label',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref);
    }
});
Label.propTypes = {
    ...HoistInputPropTypes,
    children: PT.node
};

//-----------------------
// Implementation
//-----------------------
const cmp = hoistCmp.factory(
    ({model, className, style, width, children}, ref) => {
        return div({
            className,
            style: {...style, whiteSpace: 'nowrap', width},
            items: children,
            ref
        });
    }
);