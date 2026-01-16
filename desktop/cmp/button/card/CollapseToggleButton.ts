import {CardModel} from '@xh/hoist/cmp/card/CardModel';
import {legend} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {button, type ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {tooltip as bpTooltip} from '@xh/hoist/kit/blueprint';
import {logError, withDefault} from '@xh/hoist/utils/js';
import type {ReactElement} from 'react';

export interface CollapseToggleButtonProps extends Omit<ButtonProps, 'tooltip'> {
    cardModel?: CardModel;
    tooltip?: ReactElement | string;
}

/**
 * A convenience button to toggle a Card's expand / collapse state.
 */
export const [CollapseToggleButton, collapseToggleButton] =
    hoistCmp.withFactory<CollapseToggleButtonProps>({
        displayName: 'CollapseToggleButton',
        className: 'xh-collapse-toggle-button',
        model: false,

        render({className, cardModel, disabled, intent, tooltip, ...rest}, ref) {
            cardModel = withDefault(cardModel, useContextModel(CardModel));

            if (!cardModel) {
                logError(
                    'No CardModel available - provide via `cardModel` prop or context - button will be disabled.',
                    CollapseToggleButton
                );
                disabled = true;
            }

            const {collapsed} = cardModel,
                btn = button({
                    ref,
                    rightIcon: collapsed ? Icon.angleDown() : Icon.angleUp(),
                    onClick: () => (cardModel.collapsed = !collapsed),
                    className,
                    disabled,
                    intent,
                    ...rest
                });

            return legend(
                tooltip
                    ? bpTooltip({
                          item: btn,
                          content: tooltip,
                          intent
                      })
                    : btn
            );
        }
    });
