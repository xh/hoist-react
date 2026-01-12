/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {type ReactElement, type ReactNode, type JSX, useState} from 'react';
import {tooltip as bpTooltip} from '@xh/hoist/kit/blueprint';
import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import type {Intent, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import {legend} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon/Icon';

export interface CollapsibleSetButtonProps extends HoistProps {
    icon?: ReactElement;
    text: ReactNode;
    tooltip?: JSX.Element | string;
    clickHandler?: (boolean) => void;
    intent?: Intent;
    collapsed?: boolean;
    disabled?: boolean;
}

export const [CollapsibleSetButton, collapsibleSetButton] =
    hoistCmp.withFactory<CollapsibleSetButtonProps>({
        displayName: 'CollapsibleSetButton',
        model: false,
        render({icon, text, tooltip, intent, clickHandler, collapsed, disabled}) {
            const [isCollapsed, setIsCollapsed] = useState<boolean>(collapsed === true),
                btn = button({
                    text: fragment(text, isCollapsed ? Icon.angleDown() : Icon.angleUp()),
                    icon,
                    outlined: isCollapsed && !intent,
                    minimal: !intent || (intent && !isCollapsed),
                    intent,
                    disabled,
                    onClick: () => {
                        const val = !isCollapsed;
                        setIsCollapsed(val);
                        clickHandler?.(val);
                    }
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
