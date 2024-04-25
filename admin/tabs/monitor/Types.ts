/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

export interface MonitorResults {
    code: string;
    name: string;
    sortOrder: string;
    primaryOnly: boolean;
    metricUnit: string;
    status: MonitorStatus;
    results: MonitorResult[];
    dateComputed: number;

    cyclesAsSuccess: number;
    cyclesAsFail: number;
    cyclesAsWarn: number;
    lastStatusChanged: number;
}

export type MonitorStatus = 'OK' | 'WARN' | 'FAIL' | 'INACTIVE' | 'UNKNOWN';

export interface MonitorResult {
    instance: string;
    primary: boolean;
    status: MonitorStatus;
    metric: number;
    message: string;
    elapsed: number;
    date: number;
    exception: string;
}
