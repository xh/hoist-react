/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
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
export let ColChooserModalModel = null;
export let ColChooserPanelModel = null;
export let ColumnHeaderFilterModel = null;
export let ModalSupportModel = null;
export let DashContainerViewModel = null;
export let colChooser = null;
export let colChooserPanel = null;
export let zoneMapper = null;
export let columnHeaderFilter = null;
export let dockContainerImpl = null;
export let gridFilterDialog = null;
export let pinPadImpl = null;
export let storeFilterFieldImpl = null;
export let tabContainerImpl = null;
export let useContextMenu = null;
export let errorMessageImpl = null;
export let maskImpl = null;
export let DynamicTabSwitcherModel = null;
export let cardHeaderImpl = null;
/**
 * Provide implementations of functions and classes exported in this file.
 *
 * Not for Application use.
 */
export function installDesktopImpls(impls) {
    ColChooserModalModel = impls.ColChooserModalModel;
    ColChooserPanelModel = impls.ColChooserPanelModel;
    ColumnHeaderFilterModel = impls.ColumnHeaderFilterModel;
    ModalSupportModel = impls.ModalSupportModel;
    DashContainerViewModel = impls.DashContainerViewModel;
    colChooser = impls.colChooser;
    colChooserPanel = impls.colChooserPanel;
    zoneMapper = impls.zoneMapper;
    columnHeaderFilter = impls.columnHeaderFilter;
    dockContainerImpl = impls.dockContainerImpl;
    gridFilterDialog = impls.gridFilterDialog;
    pinPadImpl = impls.pinPadImpl;
    storeFilterFieldImpl = impls.storeFilterFieldImpl;
    tabContainerImpl = impls.tabContainerImpl;
    useContextMenu = impls.useContextMenu;
    errorMessageImpl = impls.errorMessageImpl;
    maskImpl = impls.maskImpl;
    DynamicTabSwitcherModel = impls.DynamicTabSwitcherModel;
    cardHeaderImpl = impls.cardHeaderImpl;
}
