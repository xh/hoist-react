/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {tag} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
// import './Badge.scss';

/**
 * Badge indicator displayed inline with text/title - usually in a tab - showing a count or other
 * small indicator that something is new or has content.
 */
export const [Badge, badge] = hoistCmp.withFactory({
    displayName: 'Badge',
    className: 'xh-badge',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref);
    }
});
Badge.propTypes = {
    ...HoistInputPropTypes,

    value: PT.bool,

    /** True if the control should appear as an inline element (defaults to true). */
    inline: PT.bool,

    /**
     * Label displayed adjacent to the control itself.
     * Can be used with or without an additional overall label as provided by FormField.
     */
    label: PT.oneOfType([PT.string, PT.element]),

    /** Placement of the inline label relative to the control itself, default right. */
    labelSide: PT.oneOf(['left', 'right'])
};

//-----------------------
// Implementation
//-----------------------
const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {

        return tag({
            disabled: props.disabled,
            inline: withDefault(props.inline, true),
            label: props.label,
            style: props.style,
            tabIndex: props.tabIndex,

            id: props.id,
            className,

            onBlur: model.onBlur,
            onFocus: model.onFocus,
            onChange: (e) => model.noteValueChange(e.target.checked),
            inputRef: model.inputRef,
            ref
        });
    }
);
