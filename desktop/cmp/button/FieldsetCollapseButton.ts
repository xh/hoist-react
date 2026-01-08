/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {type ReactElement, type ReactNode, useState} from 'react';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {legend} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon/Icon';

export interface FieldsetCollapseButtonProps extends HoistProps {
    icon?: ReactElement;
    text: ReactNode;
    clickHandler?: (boolean) => void;
    collapsed?: boolean;
    disabled?: boolean;
}

export const [FieldsetCollapseButton, fieldsetCollapseButton] =
    hoistCmp.withFactory<FieldsetCollapseButtonProps>({
        displayName: 'FieldsetCollapseButton',
        model: false,
        render({icon, text, clickHandler, collapsed, disabled}) {
            const [isCollapsed, setIsCollapsed] = useState<boolean>(collapsed === true);

            return legend(
                button({
                    text,
                    icon,
                    rightIcon: isCollapsed ? Icon.angleDown() : Icon.angleUp(),
                    outlined: false,
                    disabled,
                    onClick: () => {
                        const val = !isCollapsed;
                        setIsCollapsed(val);
                        clickHandler?.(val);
                    }
                })
            );
        }
    });
