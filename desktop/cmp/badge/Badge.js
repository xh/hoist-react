/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
// import {tag} from '@xh/hoist/kit/blueprint';
// import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
// import './Badge.scss';

/**
 * Badge indicator displayed inline with text/title - usually in a tab - showing a count or other
 * small indicator that something is new or has content.
 */
export const [Badge, badge] = hoistCmp.withFactory({
    displayName: 'Badge',
    className: 'xh-badge',
    render() {
        return <div>
            hi
        </div>;

        // return useHoistInputModel(cmp, props, ref);
    }
});
Badge.propTypes = {

    value: PT.bool,

    active: PT.bool,

    /**
     * Label displayed inside of the badge, usually a count.
     */
    label: PT.oneOfType([PT.string, PT.number]),

    /**
     * Size of badge relative to font-size of the containing block
     */
    size: PT.number
};

//-----------------------
// Implementation
//-----------------------
// const cmp = hoistCmp.factory(
//     ({model, className, ...props}, ref) => {
//
//         return tag({
//             active: props.active,
//             // intent: PT.oneOf(['primary', 'success', 'warning', 'danger']),
//             htmlTitle: PT.string,
//             id: props.id,
//             className,
//
//             onBlur: model.onBlur,
//             onFocus: model.onFocus,
//             // inputRef: model.inputRef,
//             ref
//         });
//     }
// );
