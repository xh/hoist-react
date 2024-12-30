/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

/**
 * Data-type specific cell formats used in server-side Excel exports.
 * Specify for a Grid Column via the `Column.excelFormat` config.
 */
export const ExcelFormat = {
    DEFAULT: 'General',

    // ExcelFormat that enables text wrapping when used with Column.exportWidth.
    LONG_TEXT: 'Text',

    // Numbers
    NUM: '0',
    NUM_1DP: '0.0',
    NUM_2DP: '0.00',
    NUM_4DP: '0.0000',

    NUM_DELIMITED: '#,##0',
    NUM_DELIMITED_1DP: '#,##0.0',
    NUM_DELIMITED_2DP: '#,##0.00',
    NUM_DELIMITED_4DP: '#,##0.0000',

    LEDGER: '#,##0_);(#,##0)',
    LEDGER_1DP: '#,##0.0_);(#,##0.0)',
    LEDGER_2DP: '#,##0.00_);(#,##0.00)',
    LEDGER_4DP: '#,##0.0000_);(#,##0.0000)',

    LEDGER_COLOR: '#,##0_);[Red](#,##0)',
    LEDGER_COLOR_1DP: '#,##0.0_);[Red](#,##0.0)',
    LEDGER_COLOR_2DP: '#,##0.00_);[Red](#,##0.00)',
    LEDGER_COLOR_4DP: '#,##0.0000_);[Red](#,##0.0000)',

    // Rounding suffixes - these can be appended to the patterns above to round numbers
    THOUSANDS: ',"k"',
    MILLIONS: ',,"m"',
    BILLIONS: ',,,"b"',

    // Percent
    PCT: '0%',
    PCT_1DP: '0.0%',
    PCT_2DP: '0.00%',
    PCT_4DP: '0.0000%',

    // Dates
    DATE_FMT: 'yyyy-mm-dd',
    DATETIME_FMT: 'yyyy-mm-dd h:mm AM/PM'
};
