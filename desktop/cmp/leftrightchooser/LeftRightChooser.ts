/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridOptions} from '@ag-grid-community/core';
import {grid} from '@xh/hoist/cmp/grid';
import {hframe, vbox} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {chooserToolbar} from './impl/ChooserToolbar';
import {description} from './impl/Description';
import './LeftRightChooser.scss';
import {LeftRightChooserModel} from './LeftRightChooserModel';

export interface LeftRightChooserProps extends HoistProps<LeftRightChooserModel>, BoxProps {}

/**
 * A component for moving a list of items between two arbitrary groups. By convention, the left
 * group represents 'available' items and the right group represents 'selected' items.
 * A nested panel is also available to display a more in-depth description for any selected item.
 * @see LeftRightChooserModel
 */
export const [LeftRightChooser, leftRightChooser] = hoistCmp.withFactory<LeftRightChooserProps>({
    displayName: 'LeftRightChooser',
    model: uses(LeftRightChooserModel),
    className: 'xh-lr-chooser',

    render({model, ...props}, ref) {
        const agOptions: GridOptions = {
            defaultColDef: {
                resizable: false
            }
        };

        return vbox({
            ref,
            items: [
                hframe({
                    className: 'xh-lr-chooser__grid-frame',
                    items: [
                        grid({model: model.leftModel, agOptions}),
                        chooserToolbar(),
                        grid({model: model.rightModel, agOptions})
                    ]
                }),
                description()
            ],
            ...props
        });
    }
});
