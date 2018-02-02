/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import * as fn from './FormatNumber';
import * as fd from './FormatDate';
import * as fu from './FormatUtils';


export const fmtNumber = fn.fmtNumber,
    fmtThousands = fn.fmtThousands,
    fmtMillions = fn.fmtMillions,
    fmtBillions = fn.fmtBillions,
    fmtQuantity = fn.fmtQuantity,
    fmtPrice = fn.fmtPrice,
    fmtPercent = fn.fmtPercent,
    fmtExportPercent = fn.fmtExportPercent,
    fmtDate = fd.fmtDate,
    fmtDateTime = fd.fmtDateTime,
    fmtTime = fd.fmtTime,
    fmtCompactDate = fd.fmtCompactDate,
    capitalizeWords = fu.capitalizeWords,
    fmtSpan = fu.fmtSpan;

//-------------
// Renderers
//-------------
export const numberRenderer = fu.createRenderer(fmtNumber),
    thousandsRenderer = fu.createRenderer(fmtThousands),
    millionsRenderer = fu.createRenderer(fmtMillions),
    billionsRenderer = fu.createRenderer(fmtBillions),
    quantityRenderer = fu.createRenderer(fmtQuantity),
    priceRenderer = fu.createRenderer(fmtPrice),
    percentRenderer = fu.createRenderer(fmtPercent),
    exportPercentRenderer = fu.createRenderer(fmtExportPercent),
    dateRenderer = fu.createRenderer(fmtDate),
    dateTimeRenderer = fu.createRenderer(fmtDateTime),
    timeRenderer = fu.createRenderer(fmtTime),
    compactDateRenderer = fu.createRenderer(fmtCompactDate);
