/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {ZoneGridModel} from '../../../cmp/zoneGrid';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import '@xh/hoist/mobile/register';

export interface ZoneMapperButtonProps extends ButtonProps {
    /** ZoneGridModel of the grid for which this button should show a chooser. */
    zoneGridModel?: ZoneGridModel;
}

/**
 * A convenience button to trigger the display of a ZoneMapper UI for ZoneGrid configuration.
 *
 * Requires a `ZoneGridModel.zoneMapperModel` config option, set to true for default implementation.
 */
export const [ZoneMapperButton, zoneMapperButton] = hoistCmp.withFactory<ZoneMapperButtonProps>({
    displayName: 'ZoneMapperButton',
    model: false,
    render({zoneGridModel, icon = Icon.gridLarge(), onClick, ...props}) {
        zoneGridModel = withDefault(zoneGridModel, useContextModel(ZoneGridModel));

        if (!zoneGridModel) {
            console.error(
                "No ZoneGridModel available to ZoneMapperButton. Provide via a 'zoneGridModel' prop, or context."
            );
            return button({icon, disabled: true, ...props});
        }

        onClick = onClick ?? (() => zoneGridModel.showMapper());

        return button({icon, onClick, ...props});
    }
});
