/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {
    Group,
    type GroupProps,
    Panel,
    type PanelProps,
    Separator,
    type SeparatorProps
} from 'react-resizable-panels';

export {Group, Panel, Separator};
export type {
    GroupImperativeHandle,
    GroupProps,
    Layout,
    LayoutChangedMeta,
    PanelProps,
    SeparatorProps
} from 'react-resizable-panels';

export const group = elementFactory<GroupProps>(Group);
export const panel = elementFactory<PanelProps>(Panel);
export const separator = elementFactory<SeparatorProps>(Separator);
