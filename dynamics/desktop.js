/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */


/**
 * The exports below are platform specific classes we would like to use (carefully!) in our
 * cross-platform code.
 *
 * These are dynamically bound in the method below. This dynamic binding ensures that they are
 * included only on the intended platform to avoid platform specific code contaminating the builds
 * of other platforms.
 *
 * See the platform specific AppContainer where these implementations are actually provided.
 */
export let tabContainerImpl = null;
export let dockContainerImpl = null;
export let colChooser = null;
export let columnHeaderFilter = null;
export let gridFilterDialog = null;
export let storeFilterFieldImpl = null;
export let pinPadImpl = null;

export let StoreContextMenu = null;
export let ColChooserModel = null;
export let ColumnHeaderFilterModel = null;

/**
 * Provide implementations of functions and classes exported in this file.
 *
 * Not for Application use.
 */
export function installDesktopImpls(impls) {
    tabContainerImpl = impls.tabContainerImpl;
    dockContainerImpl = impls.dockContainerImpl;
    storeFilterFieldImpl = impls.storeFilterFieldImpl;
    pinPadImpl = impls.pinPadImpl;
    colChooser = impls.colChooser;
    columnHeaderFilter = impls.columnHeaderFilter;
    gridFilterDialog = impls.gridFilterDialog;

    StoreContextMenu = impls.StoreContextMenu;
    ColChooserModel = impls.ColChooserModel;
    ColumnHeaderFilterModel = impls.ColumnHeaderFilterModel;
}
