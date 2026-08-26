/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Intent} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {ReactElement} from 'react';

/** Primitive value types supported as a SegmentedControl option value/label. */
export type OptionPrimitive = string | number | boolean | LocalDate;

/**
 * Option for a SegmentedControl, shared by the desktop and mobile implementations.
 */
export interface SegmentedControlOption {
    /** Value for this option. */
    value: OptionPrimitive;

    /** Display label. Defaults to `value.toString()` if omitted. */
    label?: string;

    /** Icon element, displayed before the label. */
    icon?: ReactElement;

    /** True to disable this individual option. */
    disabled?: boolean;

    /**
     * Visual intent for this option - rendered as a solid fill when selected and as a subtle
     * text-color hint when not (e.g. to flag a destructive choice). Overrides any control-level
     * `intent` default. Defaults to the control's `intent`.
     */
    intent?: Intent;

    /**
     * Optional stable identifier emitted on this option's rendered button as `data-testid`, for
     * use by E2E tests. If omitted and the control itself has a `testId`, one is auto-derived as
     * `${controlTestId}-${value}`. If neither is set, no attribute is emitted.
     */
    testId?: string;
}

/**
 * Variant of SegmentedControlOption for representing a null/"no value" selection.
 * Label is required to force use case to override default js 'null' toString rendering.
 */
export interface SegmentedControlNullOption {
    /** Null value for this option. */
    value: null;

    /** Display label - required for null options. */
    label: string;

    /** Icon element, displayed before the label. */
    icon?: ReactElement;

    /** True to disable this individual option. */
    disabled?: boolean;

    /**
     * Visual intent for this option - rendered as a solid fill when selected and as a subtle
     * text-color hint when not (e.g. to flag a destructive choice). Overrides any control-level
     * `intent` default. Defaults to the control's `intent`.
     */
    intent?: Intent;

    /**
     * Optional stable identifier emitted on this option's rendered button as `data-testid`, for
     * use by E2E tests. If omitted and the control itself has a `testId`, one is auto-derived as
     * `${controlTestId}-null`. If neither is set, no attribute is emitted.
     */
    testId?: string;
}
