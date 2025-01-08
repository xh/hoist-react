/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {GridModel, GridAutosizeOptions} from '@xh/hoist/cmp/grid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {logError, withDefault} from '@xh/hoist/utils/js';

export interface ColAutosizeButtonProps extends ButtonProps {
    /** GridModel of the grid for which this button should autosize columns. */
    gridModel?: GridModel;

    /** Options for the grid autosize. */
    autosizeOptions?: Omit<GridAutosizeOptions, 'mode'>;
}

/**
 * A convenience button to autosize visible Grid columns.
 */
export const [ColAutosizeButton, colAutosizeButton] = hoistCmp.withFactory<ColAutosizeButtonProps>({
    displayName: 'ColAutosizeButton',
    model: false,

    render({gridModel, icon = Icon.arrowsLeftRight(), onClick, autosizeOptions = {}, ...props}) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        if (!gridModel?.autosizeEnabled) {
            logError(
                "No GridModel available with autosize enabled. Provide via a 'gridModel' prop, or context.",
                ColAutosizeButton
            );
            return button({icon, disabled: true, ...props});
        }

        onClick =
            onClick ??
            (() =>
                gridModel.autosizeAsync({
                    showMask: true,
                    ...autosizeOptions
                }));

        return button({icon, onClick, ...props});
    }
});
