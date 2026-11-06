/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isNumber} from 'lodash';
import type {PdfViewerToolbarModel} from './PdfViewerToolbarModel';
import type {PdfScale} from '../Types';

const PRESETS: {value: PdfScale; label: string}[] = [
    {value: 'page-width', label: 'Fit width'},
    {value: 'page-fit', label: 'Fit page'},
    {value: 'page-actual', label: 'Actual size'},
    {value: 'auto', label: 'Automatic'}
];

const PERCENTS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/**
 * Options for a zoom level select, including the current scale if not otherwise listed.
 * @internal
 */
export function getZoomOptions(model: PdfViewerToolbarModel): {value: PdfScale; label: string}[] {
    const {scale} = model,
        ret = [...PRESETS, ...PERCENTS.map(value => ({value, label: formatScale(value)}))];

    if (isNumber(scale) && !PERCENTS.includes(scale)) {
        ret.push({value: scale, label: formatScale(scale)});
    }
    return ret;
}

function formatScale(scale: number): string {
    return `${Math.round(scale * 100)}%`;
}
