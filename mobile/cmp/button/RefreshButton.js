/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {elemFactory, hoistComponent, useModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {warnIf} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If a model is provided it will be directly refreshed.  Alternatively an onClick handler
 * may be provided.  If neither of these props are provided, the contextual RefreshContextModel
 * for this button will be used.
 */
export const RefreshButton = hoistComponent({
    displayName: 'RefreshButton',

    render(model, ...props) {
        warnIf(
            model && props.onClick,
            'RefreshButton may be provided either a model or an onClick handler to call (but not both).'
        );

        const target = useModel('RefreshContextModel') || props.model;

        return button({
            icon: Icon.sync(),
            onClick: () => target && target.refreshAsync(),
            ...props
        });
    }
});
export const refreshButton = elemFactory(RefreshButton);

RefreshButton.propTypes = {
    icon: PT.element,

    /** Function to call when the button is clicked. */
    onClick: PT.func,

    /** HoistModel to refresh. */
    model: PT.object
};
