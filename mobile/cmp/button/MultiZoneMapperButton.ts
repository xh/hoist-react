/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {MultiZoneGridModel} from '@xh/hoist/mobile/cmp/multiZoneGrid';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import '@xh/hoist/mobile/register';

export interface MultiZoneMapperButtonProps extends ButtonProps {
    multiZoneGridModel?: MultiZoneGridModel;
}

/**
 * Todo
 */
export const [MultiZoneMapperButton, multiZoneMapperButton] =
    hoistCmp.withFactory<MultiZoneMapperButtonProps>({
        displayName: 'MultiZoneMapperButton',
        model: false,
        render({multiZoneGridModel, icon = Icon.gridLarge(), onClick, ...props}) {
            multiZoneGridModel = withDefault(
                multiZoneGridModel,
                useContextModel(MultiZoneGridModel)
            );

            if (!multiZoneGridModel) {
                console.error(
                    "No MultiZoneGridModel available to MultiZoneMapperButton. Provide via a 'multiZoneGridModel' prop, or context."
                );
                return button({icon, disabled: true, ...props});
            }

            onClick = onClick ?? (() => multiZoneGridModel.showMapper());

            return button({icon, onClick, ...props});
        }
    });
