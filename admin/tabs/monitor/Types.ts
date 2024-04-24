/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

export type Status = 'OK' | 'WARN' | 'FAIL' | 'INACTIVE' | 'UNKNOWN';

export interface MonitorResults {
    code: string;
    name: string;
    sortOrder: string;
    primaryOnly: boolean;
    metricUnit: string;
    status: Status;
    results: MonitorResult[];
    dateComputed: number;

    cyclesAsSuccess: number;
    cyclesAsFail: number;
    cyclesAsWarn: number;
    lastStatusChanged: number;
}

export interface MonitorResult {
    instance: string;
    primary: boolean;
    status: Status;
    metric: number;
    message: string;
    elapsed: number;
    date: number;
    exception: string;
}
