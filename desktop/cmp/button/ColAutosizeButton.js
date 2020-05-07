/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {errorIf, withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import {button, Button} from './Button';

/**
 * A convenience button to autosize visible Grid columns.
 */
export const [ColAutosizeButton, colAutosizeButton] = hoistCmp.withFactory({
    displayName: 'ColAutosizeButton',
    model: false,

    render({icon, title, onClick, gridModel, disabled, autosizeOptions = {}, ...rest}) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        errorIf(!gridModel, "No GridModel available to ColAutosizeButton. Provide via a 'gridModel' prop, or context.");

        onClick = onClick ?? (() => gridModel.autosizeAsync(autosizeOptions));

        return button({
            icon: withDefault(icon, Icon.arrowsLeftRight()),
            title: withDefault(title, 'Autosize Columns'),
            onClick,
            disabled: withDefault(disabled, gridModel && gridModel.empty),
            ...rest
        });
    }
});
ColAutosizeButton.propTypes = {
    ...Button.propTypes,

    /** GridModel of the grid for which this button should autosize columns. */
    gridModel: PT.instanceOf(GridModel),

    /** Options for the grid autosize. {@see GridModel#autosizeAsync()} */
    autosizeOptions: PT.object
};


