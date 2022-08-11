/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {merge} from 'lodash';
import {div} from './Tags';

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
export const [Box, box] = hoistCmp.withFactory({
    displayName: 'Box',
    model: false, memo: false, observer: false,

    render(props, ref) {
        // Note `model` destructured off of non-layout props to avoid setting model as a bogus DOM
        // attribute. This low-level component does not lookup a model from context, but it may
        // easily be passed one from a parent that has not properly managed its own props.
        let [layoutProps, {children, model, ...restProps}] = splitLayoutProps(props);

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

export const [VBox, vbox] = hoistCmp.withFactory({
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

export const [HBox, hbox] = hoistCmp.withFactory({
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
