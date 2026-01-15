/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {CollapsibleSetModel} from '@xh/hoist/cmp/collapsibleset/CollapsibleSetModel';
import {type ReactElement, type ReactNode, type JSX} from 'react';
import {tooltip as bpTooltip} from '@xh/hoist/kit/blueprint';
import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import type {Intent, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import {legend} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon/Icon';

export interface CollapsibleSetButtonProps extends HoistProps<CollapsibleSetModel> {
    icon?: ReactElement;
    text: ReactNode;
    tooltip?: JSX.Element | string;
    intent?: Intent;
    disabled?: boolean;
}

export const [CollapsibleSetButton, collapsibleSetButton] =
    hoistCmp.withFactory<CollapsibleSetButtonProps>({
        displayName: 'CollapsibleSetButton',
        model: uses(CollapsibleSetModel),
        render({icon, text, tooltip, intent, disabled, model}) {
            const {collapsed} = model,
                btn = button({
                    text: fragment(text, collapsed ? Icon.angleDown() : Icon.angleUp()),
                    icon,
                    outlined: collapsed && !intent,
                    minimal: !intent || (intent && !collapsed),
                    intent,
                    disabled,
                    onClick: () => (model.collapsed = !collapsed)
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
