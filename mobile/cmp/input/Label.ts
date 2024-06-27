/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {DefaultHoistProps, hoistCmp, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import './Label.scss';

export interface LabelProps extends HoistInputProps<null>, StyleProps {}

/**
 * A simple label for a form.
 */
export const [Label, label] = hoistCmp.withFactory<LabelProps>({
    displayName: 'Label',
    className: 'xh-input-label',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, LabelInputModel);
    }
});

class LabelInputModel extends HoistInputModel<null> {
    override xhImpl = true;
}

//-----------------------
// Implementation
//-----------------------
const cmp = hoistCmp.factory<DefaultHoistProps<LabelInputModel, HTMLDivElement>>(
    ({className, style, width, children}, ref) => {
        return div({
            className,
            style: {...style, whiteSpace: 'nowrap', width},
            items: children,
            ref
        });
    }
);
