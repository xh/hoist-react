/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {div, span} from '@xh/hoist/cmp/layout';
import {markdown} from '@xh/hoist/cmp/markdown';
import {XH} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {ReactNode} from 'react';

/**
 * Generate a standardized filename for an Admin module grid export, without datestamp.
 */
export function exportFilename(moduleName: string): string {
    return `${XH.appCode}-${moduleName}`;
}

/**
 * Generate a standardized filename for an Admin module grid export, with current datestamp.
 * Returned as a closure to ensure current date is evaluated at export time.
 */
export function exportFilenameWithDate(moduleName: string): () => string {
    return () => `${XH.appCode}-${moduleName}-${LocalDate.today()}`;
}

export function getAppModel<T extends AppModel>() {
    return XH.appModel as T;
}

/** Muted "N/A" placeholder for empty values in read-only detail forms. */
export function naSpan(): ReactNode {
    return span({item: 'N/A', className: 'xh-text-color-muted'});
}

/** Readonly renderer for detail forms - the value as-is, or {@link naSpan} when null. */
export function valOrNa(v: any): ReactNode {
    return v != null ? v : naSpan();
}

/** Readonly renderer for boolean fields in detail forms - "Yes" / "No", or {@link naSpan} when null. */
export function yesNoRenderer(v: boolean): ReactNode {
    return v == null ? naSpan() : v ? 'Yes' : 'No';
}

/**
 * Readonly renderer for free-text fields in detail forms that may contain Markdown (notes,
 * descriptions). Renders via {@link markdown} within a wrapper styled for compact display, or
 * {@link naSpan} when null.
 */
export function markdownRenderer(v: string): ReactNode {
    return v == null
        ? naSpan()
        : div({className: 'xh-admin-readonly-form__markdown', item: markdown({content: v})});
}
