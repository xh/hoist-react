/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {ZonedGridModel} from '../zonedGrid';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import '@xh/hoist/mobile/register';

export interface ZoneMapperButtonProps extends ButtonProps {
    zonedGridModel?: ZonedGridModel;
}

/**
 * A convenience button to trigger the display of a ZoneMapper UI for ZonedGrid configuration.
 *
 * Requires a `ZonedGridModel.zoneMapperModel` config option, set to true for default implementation.
 */
export const [ZoneMapperButton, zoneMapperButton] = hoistCmp.withFactory<ZoneMapperButtonProps>({
    displayName: 'ZoneMapperButton',
    model: false,
    render({zonedGridModel, icon = Icon.gridLarge(), onClick, ...props}) {
        zonedGridModel = withDefault(zonedGridModel, useContextModel(ZonedGridModel));

        if (!zonedGridModel) {
            console.error(
                "No ZonedGridModel available to ZoneMapperButton. Provide via a 'zonedGridModel' prop, or context."
            );
            return button({icon, disabled: true, ...props});
        }

        onClick = onClick ?? (() => zonedGridModel.showMapper());

        return button({icon, onClick, ...props});
    }
});
