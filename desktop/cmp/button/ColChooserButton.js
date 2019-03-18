/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import PT from 'prop-types';
import {hoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from './Button';


/**
 * A convenience button to trigger the display of a ColChooser for user selection and discovery of
 * available Grid columns. For use by applications when a button is desired in addition to the
 * context menu item built into the Grid component directly.
 *
 * Requires the `GridModel.enableColChooser` config option to be true.
 */
export const [ColChooserButton, colChooserButton] = hoistComponent(
    ({gridModel, ...buttonProps}) => {
        return button({
            icon: Icon.gridPanel(),
            title: 'Choose grid columns...',
            onClick: () => gridModel.showColChooser(),
            ...buttonProps
        });
    });

ColChooserButton.propTypes = {
    ...Button.propTypes,

    /** GridModel of the grid for which this button should show a chooser. */
    gridModel: PT.instanceOf(GridModel).isRequired
};
