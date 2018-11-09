/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


export let StoreContextMenu = null;
export let ColChooserModel = null;
export let colChooser = null;

/**
 * Provide implementations of functions and classes exported in this file.
 *
 * Not for Application use.  Called by platform-specific AppContainer.
 */
export function installDesktopImpls(config) {
    StoreContextMenu = config.StoreContextMenu;
    ColChooserModel = config.ColChooserModel;
    colChooser = config.colChooser;
}