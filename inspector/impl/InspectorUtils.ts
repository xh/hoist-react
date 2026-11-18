/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistBase} from '@xh/hoist/core';

/** Label for an instance within Inspector - its `xhName` or class name, plus `xhId`. */
export function instanceLabel(inst: HoistBase): string {
    return `${inst.xhName ?? inst.constructor.name} [${inst.xhId}]`;
}
