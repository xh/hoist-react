import {fmtNumber} from '@xh/hoist/format/FormatNumber';

/*
 * Floor of log base 1000 for each popular unit of storage
 */
export const MAGNITUDE_BYTE = 0,
    MAGNITUDE_KILOBYTE = 1,
    MAGNITUDE_MEGABYTE = 2,
    MAGNITUDE_GIGABYTE = 3,
    MAGNITUDE_TERABYTE = 4,
    MAGNITUDE_PETABYTE = 5;

/*
 *
 */
export const SIZE_LABELS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];


/**
 * Renders the sizes of files as a string of an appropriate size appended with the correct unit, from bytes to petabytes
 *
 * @param {number} v - a number value of the size, in bytes
 * @param {Object} opts - an options object:
 * @param {number} opts.maxUnit - the largest data unit displayed
 */
export function fmtFileSize(v, opts= {maxUnit: MAGNITUDE_PETABYTE}) {
    if (v == null) return '';
    if (v < 0) return '';

    let vLog1000 = Math.floor(Math.log10(v) / 3);
    if (vLog1000 > opts.maxUnit) vLog1000 = opts.maxUnit;
    if (vLog1000 >= SIZE_LABELS.length) vLog1000 = SIZE_LABELS.length-1;

    return fmtNumber(v / 1000 ** vLog1000, {
        label: ' ' + SIZE_LABELS[vLog1000],
        precision: 3,
        labelCls: null,
        asHtml: true
    });
}