/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {filler} from '@xh/hoist/cmp/layout';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {leftRightChooser, leftRightChooserFilter} from '@xh/hoist/desktop/cmp/leftrightchooser';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import {ColChooserModel} from './ColChooserModel';

/**
 * Hoist UI for user selection and discovery of available Grid columns, enabled via the
 * GridModel.enableColChooser config option.
 *
 * This component displays both available and currently visible columns in two left/right
 * grids, allowing users to toggle columns on and off within its associated grid.
 *
 * It derives its configuration primary from the Grid's Column definitions, supporting features such
 * as custom column display names and descriptions, grouped display of the available column library,
 * and a quick filter for long lists.
 *
 * It is not necessary to manually create instances of this component within an application.
 */
export const colChooser = hoistCmp.factory({
    model: uses(ColChooserModel),
    className: 'xh-col-chooser',

    render({model, className, width, height}) {
        const {gridModel, lrModel, isPopoverOpen} = model;

        return panel({
            className,
            items: [
                leftRightChooser({
                    model: lrModel,
                    width: withDefault(width, 500),
                    height: withDefault(height, 300)
                }),
                toolbar(
                    leftRightChooserFilter({model: lrModel, fields: ['text']}),
                    filler(),
                    button({
                        text: 'Reset',
                        icon: Icon.undo({className: 'xh-red'}),
                        omit: !gridModel.stateModel,
                        onClick: () => model.restoreDefaults()
                    }),
                    toolbarSep({
                        omit: !gridModel.stateModel
                    }),
                    button({
                        text: isPopoverOpen ? 'Close' : 'Cancel',
                        onClick: () => model.close()
                    }),
                    button({
                        omit: isPopoverOpen,
                        text: 'Save',
                        icon: Icon.check({className: 'xh-green'}),
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