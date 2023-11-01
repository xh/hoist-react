/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/desktop/register';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {div, vbox} from '@xh/hoist/cmp/layout';
import {ZonedGridModel, ZoneMapperModel} from '@xh/hoist/cmp/zonedGrid';
import {zoneMapper} from '@xh/hoist/desktop/cmp/zonedGrid/impl/ZoneMapper';
import {Icon} from '@xh/hoist/icon';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {stopPropagation, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from './Button';

export interface ZoneMapperButtonProps extends ButtonProps {
    /** ZonedGridModel of the grid for which this button should show a chooser. */
    zonedGridModel?: ZonedGridModel;

    /** Position for chooser popover, as per Blueprint docs. */
    popoverPosition?: Position;
}

/**
 * A convenience button to trigger the display of a ZoneMapper UI for ZonedGrid configuration.
 *
 * Requires a `ZonedGridModel.zoneMapperModel` config option, set to true for default implementation.
 */
export const [ZoneMapperButton, zoneMapperButton] = hoistCmp.withFactory<ZoneMapperButtonProps>({
    displayName: 'ZoneMapperButton',
    model: false,
    render({icon, title, zonedGridModel, popoverPosition, disabled, ...rest}, ref) {
        zonedGridModel = withDefault(zonedGridModel, useContextModel(ZonedGridModel));

        const mapperModel = zonedGridModel?.mapperModel as ZoneMapperModel;

        if (!zonedGridModel) {
            console.error(
                "No ZonedGridModel available to ZoneMapperButton. Provide via a 'zonedGridModel' prop, or context."
            );
            disabled = true;
        }

        if (!mapperModel) {
            console.error(
                'No ZoneMapperModel available on bound ZonedGridModel - enable via ZonedGridModel.zoneMapperModel config.'
            );
            disabled = true;
        }

        return popover({
            popoverClassName: 'xh-zone-mapper-popover xh-popup--framed',
            position: withDefault(popoverPosition, 'auto'),
            isOpen: mapperModel.isPopoverOpen,
            target: button({
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
            onInteraction: willOpen => {
                if (willOpen) {
                    mapperModel.openPopover();
                } else {
                    mapperModel.close();
                }
            }
        });
    }
});
