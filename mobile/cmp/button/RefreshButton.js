/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel, RefreshContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {errorIf} from '@xh/hoist/utils/js';
import PT from 'prop-types';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If a model is provided it will be directly refreshed.  Alternatively an onClick handler
 * may be provided.  If neither of these props are provided, the contextual RefreshContextModel
 * for this button will be used.
 */
export const [RefreshButton, refreshButton] = hoistCmp.withFactory({
    displayName: 'RefreshButton',
    model: false,  // For consistency with all other buttons -- the model prop here could be replaced by 'target'

    render({model, icon = Icon.sync(), onClick, ...props}) {
        const refreshContextModel = useContextModel(RefreshContextModel);

        if (!onClick) {
            errorIf(model && !model.loadSupport, 'Models provided to RefreshButton must enable LoadSupport.');
            model = model ?? refreshContextModel;
            onClick = model ? () => model.refreshAsync() : null;
        }

        return button({icon, onClick, ...props});
    }
});

RefreshButton.propTypes = {
    ...Button.propTypes,

    /** HoistModel to refresh. */
    model: PT.object
};
