/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';

/**
 * A convenience button to autosize visible Grid columns.
 */
export const [ColAutosizeButton, colAutosizeButton] = hoistCmp.withFactory({
    displayName: 'ColAutosizeButton',
    model: false,

    render({
        gridModel,
        icon = Icon.arrowsLeftRight(),
        onClick,
        autosizeOptions = {},
        ...props
    }) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        if (!gridModel?.autosizeEnabled) {
            console.error("No GridModel available with autosize enabled. Provide via a 'gridModel' prop, or context.");
            return button({icon, disabled: true, ...props});
        }

        onClick = onClick ?? (() => gridModel.autosizeAsync({
            showMask: true,
            ...autosizeOptions
        }));

        return button({icon, onClick, ...props});
    }
});
ColAutosizeButton.propTypes = {
    ...Button.propTypes,

    /** GridModel of the grid for which this button should autosize columns. */
    gridModel: PT.instanceOf(GridModel),

    /** Options for the grid autosize. {@see GridModel#autosizeAsync()} */
    autosizeOptions: PT.object
};
