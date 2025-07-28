/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {logError, withDefault} from '@xh/hoist/utils/js';
import {ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';
import '@xh/hoist/mobile/register';

export interface ZoneMapperButtonProps extends ButtonProps {
    /** ZoneGridModel of the grid for which this button should show a chooser. */
    zoneGridModel?: ZoneGridModel;
}

/**
 * A convenience button to trigger the display of a ZoneMapper UI for ZoneGrid configuration.
 * Requires {@link ZoneGridConfig.zoneMapperModel} to be configured on the bound ZoneGridModel.
 */
export const [ZoneMapperButton, zoneMapperButton] = hoistCmp.withFactory<ZoneMapperButtonProps>({
    displayName: 'ZoneMapperButton',
    className: 'xh-zone-mapper-button',
    model: false,

    render({className, icon, zoneGridModel, onClick, disabled, ...rest}) {
        zoneGridModel = withDefault(zoneGridModel, useContextModel(ZoneGridModel));

        // Validate bound model available and suitable for use.
        if (!onClick) {
            if (!zoneGridModel) {
                logError(
                    'No ZoneGridModel available - provide via `zoneGridModel` prop or context - button will be disabled',
                    ZoneMapperButton
                );
                disabled = true;
            } else if (!zoneGridModel.mapperModel) {
                logError(
                    'ZoneMapper not enabled on bound ZoneGridModel - button will be disabled.',
                    ZoneMapperButton
                );
                disabled = true;
            }
        }

        onClick = onClick ?? (() => zoneGridModel.showMapper());

        return button({
            icon: withDefault(icon, Icon.gridLarge()),
            className,
            disabled,
            onClick,
            ...rest
        });
    }
});
