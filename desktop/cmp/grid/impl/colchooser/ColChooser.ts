/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {leftRightChooser, leftRightChooserFilter} from '@xh/hoist/desktop/cmp/leftrightchooser';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {ColChooserModel} from './ColChooserModel';

export interface ColChooserProps extends HoistProps<ColChooserModel> {}

/**
 * Hoist UI for user selection and discovery of available Grid columns, enabled via the
 * GridModel.colChooserModel config option.
 *
 * This component displays both available and currently visible columns in two left/right
 * grids, allowing users to toggle columns on and off within its associated grid.
 *
 * It derives its configuration primary from the Grid's Column definitions, supporting features such
 * as custom column display names and descriptions, grouped display of the available column library,
 * and a quick filter for long lists.
 *
 * @internal
 */
export const colChooser = hoistCmp.factory<ColChooserProps>({
    className: 'xh-col-chooser',

    render({model, className}) {
        const {commitOnChange, showRestoreDefaults, width, height} = model;

        return panel({
            className,
            items: [
                leftRightChooser({width, height}),
                toolbar(
                    leftRightChooserFilter(),
                    filler(),
                    button({
                        omit: !showRestoreDefaults,
                        text: 'Restore Defaults',
                        icon: Icon.undo({className: 'xh-red'}),
                        onClick: () => model.restoreDefaultsAsync()
                    }),
                    toolbarSep({
                        omit: !showRestoreDefaults
                    }),
                    button({
                        text: commitOnChange ? 'Close' : 'Cancel',
                        onClick: () => model.close()
                    }),
                    button({
                        omit: commitOnChange,
                        text: 'Save',
                        icon: Icon.check(),
                        intent: 'success',
                        onClick: () => {
                            model.commit();
                            model.close();
                        }
                    })
                )
            ]
        });
    }
});
