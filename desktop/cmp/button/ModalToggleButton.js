/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button/Button';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {errorIf, withDefault} from '@xh/hoist/utils/js';

/**
 * A convenience button to toggle a Panel's modal view state.
*/
export const [ModalToggleButton, modalToggleButton] = hoistCmp.withFactory({
    displayName: 'ModalToggleButton',
    model: false,

    render({panelModel, ...rest}, ref) {
        panelModel = withDefault(panelModel, useContextModel(PanelModel));

        errorIf(!panelModel, "No PanelModel available to ModalToggleButton. Provide via 'panelModel' prop, or context.");

        return button({
            ref,
            icon: panelModel.isModal ? Icon.close() : Icon.openExternal(),
            onClick: () => panelModel.toggleIsModal(),
            minimal: true,
            ...rest
        });
    }
});