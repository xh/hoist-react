/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button/Button';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {errorIf, withDefault} from '@xh/hoist/utils/js';

export interface ModalToggleButtonProps extends ButtonProps {
    panelModel?: PanelModel;
}

/**
 * A convenience button to toggle a Panel's modal view state.
 */
export const [ModalToggleButton, modalToggleButton] = hoistCmp.withFactory<ModalToggleButtonProps>({
    displayName: 'ModalToggleButton',
    model: false,

    render({panelModel, ...rest}, ref) {
        panelModel = withDefault(panelModel, useContextModel(PanelModel));

        errorIf(
            !panelModel,
            "No PanelModel available to ModalToggleButton. Provide via 'panelModel' prop, or context."
        );

        return button({
            ref,
            icon: panelModel.isModal ? Icon.close() : Icon.openExternal(),
            onClick: () => panelModel.toggleIsModal(),
            minimal: true,
            ...rest
        });
    }
});
