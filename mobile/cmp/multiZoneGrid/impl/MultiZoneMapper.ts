/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {HoistProps, hoistCmp, uses} from '@xh/hoist/core';
import {filler, placeholder} from '@xh/hoist/cmp/layout';
import {dialogPanel} from '@xh/hoist/mobile/cmp/panel';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {MultiZoneMapperModel} from './MultiZoneMapperModel';

export interface MultiZoneMapperProps extends HoistProps<MultiZoneMapperModel> {}

/**
 * Todo
 */
export const [MultiZoneMapper, multiZoneMapper] = hoistCmp.withFactory<MultiZoneMapperProps>({
    displayName: 'MultiZoneMapper',
    model: uses(MultiZoneMapperModel),
    className: 'xh-multi-zone-mapper',
    render({model, className}) {
        const {isOpen} = model;

        return dialogPanel({
            isOpen,
            title: 'Customize Grid Fields',
            icon: Icon.gridLarge(),
            className,
            item: placeholder('MultiZone Mapper'),
            bbar: [
                button({
                    text: 'Reset',
                    minimal: true,
                    onClick: () => model.reset()
                }),
                filler(),
                button({
                    text: 'Cancel',
                    minimal: true,
                    onClick: () => model.close()
                }),
                button({
                    text: 'Save',
                    icon: Icon.check(),
                    onClick: () => {
                        model.commit();
                        model.close();
                    }
                })
            ]
        });
    }
});
