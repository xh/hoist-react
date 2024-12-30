/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/desktop/register';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {div, vbox} from '@xh/hoist/cmp/layout';
import {ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';
import {ZoneMapperModel} from '@xh/hoist/cmp/zoneGrid/impl/ZoneMapperModel';
import {zoneMapper} from '@xh/hoist/desktop/cmp/zoneGrid/impl/ZoneMapper';
import {Icon} from '@xh/hoist/icon';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {logError, stopPropagation, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from './Button';

export interface ZoneMapperButtonProps extends ButtonProps {
    /** ZoneGridModel of the grid for which this button should show a chooser. */
    zoneGridModel?: ZoneGridModel;

    /** Position for chooser popover, as per Blueprint docs. */
    popoverPosition?: Position;
}

/**
 * A convenience button to trigger the display of a ZoneMapper UI for ZoneGrid configuration.
 *
 * Requires a `ZoneGridModel.zoneMapperModel` config option, set to true for default implementation.
 */
export const [ZoneMapperButton, zoneMapperButton] = hoistCmp.withFactory<ZoneMapperButtonProps>({
    displayName: 'ZoneMapperButton',
    model: false,
    render({icon, title, zoneGridModel, popoverPosition, disabled, ...rest}, ref) {
        zoneGridModel = withDefault(zoneGridModel, useContextModel(ZoneGridModel));

        const mapperModel = zoneGridModel?.mapperModel as ZoneMapperModel;

        if (!zoneGridModel) {
            logError(
                "No ZoneGridModel available. Provide via a 'zoneGridModel' prop, or context.",
                ZoneMapperButton
            );
            disabled = true;
        }

        if (!mapperModel) {
            logError(
                'No ZoneMapperModel available on bound ZoneGridModel - enable via ZoneGridModel.zoneMapperModel config.',
                ZoneMapperButton
            );
            disabled = true;
        }

        const isOpen = mapperModel?.isPopoverOpen;
        return popover({
            isOpen,
            popoverClassName: 'xh-zone-mapper-popover xh-popup--framed',
            position: withDefault(popoverPosition, 'auto'),
            item: button({
                icon: withDefault(icon, Icon.gridLarge()),
                title: withDefault(title, 'Customize fields...'),
                disabled,
                ...rest
            }),
            disabled,
            content: vbox({
                onClick: stopPropagation,
                onDoubleClick: stopPropagation,
                items: [
                    div({ref, className: 'xh-popup__title', item: 'Customize Fields'}),
                    zoneMapper({model: mapperModel})
                ]
            }),
            onInteraction: (nextOpenState, e) => {
                if (nextOpenState) {
                    mapperModel.openPopover();
                } else {
                    mapperModel.close();
                }
            }
        });
    }
});
