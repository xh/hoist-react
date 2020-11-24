/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, hoistInputHost} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import PT from 'prop-types';
import './Label.scss';

/**
 * A simple label for a form.
 */
export const [Label, label] = hoistCmp.withFactory({
    displayName: 'Label',
    render(props, ref) {
        return hoistInputHost({modelSpec: Model, cmpSpec: cmp, ...props, ref});
    }
});
Label.propTypes = {
    ...HoistInputPropTypes,
    children: PT.node
};

//-----------------------
// Implementation
//-----------------------
class Model extends HoistInputModel {
    baseClassName = 'xh-input-label';
    constructor(props) {
        super(props);
    }
}

const cmp = hoistCmp.factory(
    ({model, style, width, children}, ref) => {
        return div({
            className: model.getClassName(),
            style: {...style, whiteSpace: 'nowrap', width},
            items: children,
            ref
        });
    }
);