/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {merge, castArray} from 'lodash';
import {hoistComponent, useLayoutProps, useClassName} from '@xh/hoist/core';
import {div} from './Tags';

/**
 * A Component that supports flexbox-based layout of its contents.
 *
 * Box is the component that provides the core implementation of the LayoutSupport mixin.
 * It renders a div and merges all layout props to that div's `style` property.
 *
 * VBox and HBox variants support internal vertical (column) and horizontal (row) flex layouts.
 */
export const [Box, box] = hoistComponent({
    render(props) {
        let [layoutProps, {children, ...restProps}] = useLayoutProps(props);

        restProps = merge(
            {style: {display: 'flex', overflow: 'hidden', position: 'relative'}},
            {style: layoutProps},
            restProps
        );

        return div({
            ...restProps,
            items: castArray(children)
        });
    }
});

export const [VBox, vbox] = hoistComponent({
    render(props) {
        return box({
            ...props,
            flexDirection: 'column',
            className: useClassName('xh-vbox', props)
        });
    }
});

export const [HBox, hbox] = hoistComponent({
    render(props) {
        return box({
            ...props,
            flexDirection: 'row',
            className: useClassName('xh-hbox', props)
        });
    }
});