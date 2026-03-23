/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {wait} from '@xh/hoist/promise';

/**
 * Trigger a browser file download by navigating to a URL.
 * Pass an optional filename to override the name suggested by the server or URL.
 * For Blob-based downloads, use `downloadBlob()` instead.
 */
export function downloadViaUrl(url: string, filename?: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? '';
    a.click();
}

/**
 * Trigger a browser file download from a Blob.
 * Creates a temporary object URL, triggers the download, then revokes the URL.
 */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    downloadViaUrl(url, filename);
    wait(100).then(() => URL.revokeObjectURL(url));
}
