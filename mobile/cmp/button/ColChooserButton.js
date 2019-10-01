/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import PT from 'prop-types';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * A convenience button to trigger the display of a ColChooser for user selection,
 * discovery and reordering of available Grid columns.
 *
 * Requires the `GridModel.enableColChooser` config option to be true.
 */
export const [ColChooserButton, colChooserButton] = hoistCmp.withFactory({
    displayName: 'ColChooserButton',
    model: false,

    render({
        gridModel,
        icon = Icon.gridPanel(),
        onClick,
        ...props
    }) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        if (!gridModel) {
            console.error("No GridModel available to ColChooserButton. Provide via a 'gridModel' prop, or context.");
            return button({icon, disabled: true, ...props});
        }

        onClick = onClick ?? (() => gridModel.showColChooser());

        return button({icon, onClick, ...props});
    }
});
ColChooserButton.propTypes = {
    ...Button.propTypes,

    /** GridModel of the grid for which this button should show a chooser. */
    gridModel: PT.instanceOf(GridModel)
};