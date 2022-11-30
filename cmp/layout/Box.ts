/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, BoxProps, HoistProps} from '@xh/hoist/core';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {merge} from 'lodash';
import {div} from './Tags';

export interface BoxComponentProps extends HoistProps, BoxProps {}

/**
 * A Component that supports flexbox-based layout of its contents.
 *
 * Box is the component that provides the core implementation of the LayoutSupport mixin.
 * It renders a div and merges all layout props to that div's `style` property.
 *
 * Access to the internal div is provided via a ref argument.
 *
 * VBox and HBox variants support internal vertical (column) and horizontal (row) flex layouts.
 */
export const [Box, box] = hoistCmp.withContainerFactory<BoxComponentProps>({
    displayName: 'Box',
    model: false, memo: false, observer: false,

    render(props, ref) {
        // Dissect props and children for applying to div.
        // We pull off some common hoist props that might have 'leaked' through and would cause
        // a react dev-time warning. (Implementation of Form.fieldDefaults is a particular culprit)
        let [layoutProps, nonLayoutProps] = splitLayoutProps(props);
        let {
            model, modelConfig, leftIcon, commitOnChange, // leakers to remove
            children,
            ...restProps
        } = nonLayoutProps as any;

        restProps = merge(
            {style: {display: 'flex', overflow: 'hidden', position: 'relative'}},
            {style: layoutProps},
            restProps
        );

        return div({
            ref,
            ...restProps,
            items: children
        });
    }
});

export const [VBox, vbox] = hoistCmp.withContainerFactory<BoxComponentProps>({
    displayName: 'VBox',
    model: false, memo: false, observer: false,
    className: 'xh-vbox',

    render(props, ref) {
        return box({
            ref,
            ...props,
            flexDirection: 'column'
        });
    }
});

export const [HBox, hbox] = hoistCmp.withContainerFactory<BoxComponentProps>({
    displayName: 'HBox',
    model: false, memo: false, observer: false,
    className: 'xh-hbox',

    render(props, ref) {
        return box({
            ref,
            ...props,
            flexDirection: 'row'
        });
    }
});
