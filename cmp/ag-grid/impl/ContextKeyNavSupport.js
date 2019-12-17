/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {find} from 'lodash';
import {wait} from '@xh/hoist/promise';

/**
 * Support keyboard navigation on AG-Grid context menus and subMenus
 * This code adds keydown event handlers to menu items,
 * and in those handlers calls methods defined in AG-Grid's
 * https://github.com/ag-grid/ag-grid/blob/master/enterprise-modules/menu/src/menu/menuList.ts file
 * to activate/deactivate menuitems and their child menus.
 */
export class ContextKeyNavSupport {

    // see addHoverForChildPopup method in agGrid MenuList
    HOVER_DELAY = 300;

    agGridModel;

    constructor(agGridModel) {
        this.agGridModel = agGridModel;
    }

    get agApi() {
        return this.agGridModel.agApi;
    }

    addContextMenuKeyNavigation() {
        const items = this.addEventHandlersToLatestMenu();
        this.callAgMouseEnter(items[0]);
    }

    addEventHandlersToLatestMenu() {
        const items = document.querySelectorAll('.ag-popup:last-child .ag-menu-option'),
            menuCount = document.querySelectorAll('.ag-popup').length,
            base = menuCount * 1000;

        items.forEach((item, idx) => {
            item.setAttribute('tabindex', base + idx); // tabindex is what allows a div to be focusable for keydown event detection
            item.addEventListener('keydown', (evt) => this.handleContextMenuKeyNavigation(evt));
            item.addEventListener('mouseover', (evt) => this.handleMenuItemMouseover(evt));
        });
        return items;
    }

    handleMenuItemMouseover(evt) {
        const item = evt.target.closest('.ag-menu-option');
        // when mousing over, focus on menu item so that user can sswitch between mouse and keyboard
        item.focus();
        if (!this.hasSubMenu(item)) return;

        // if menuitem has submenu, wait until it has been added to the dom, and then add handlers
        wait(this.HOVER_DELAY).then(() => this.addEventHandlersToLatestMenu());
    }

    handleContextMenuKeyNavigation(evt) {
        switch (evt.key) {
            case 'ArrowRight':
                this.maybeGoToChildContextMenu(evt.target);
                break;
            case 'ArrowLeft':
                this.maybeFocusOnParentItem(evt.target);
                break;
            case 'Enter':
                this.handleEnterKey(evt);
                break;
            case 'Escape':
                this.handleEscapeKey(evt);
                break;
            case 'ArrowDown':
            case 'ArrowUp':
                this.handleUpDownKey(evt);
                break;
        }
    }

    callAgMouseEnter(item) {
        const agPopup = this.findCurrentContextMenuPopup(item);
        if (!agPopup) return;

        this.getAgMenuList(agPopup).mouseEnterItem(this.getItemDef(item), item.__agComponent);
        item.focus(); // needed to put focus on div that has tabindex for keydown event detection to work
    }

    maybeGoToChildContextMenu(item) {
        if (!this.hasSubMenu(item)) return;
        wait(this.HOVER_DELAY).then(() => this.addContextMenuKeyNavigation());
        // wait here is needed to wait for timeout used in showing submenus in AG-Grid
        // see addHoverForChildPopup method in https://github.com/ag-grid/ag-grid/blob/master/enterprise-modules/menu/src/menu/menuList.ts#L102
    }

    maybeFocusOnParentItem(item) {
        const itemDef = this.getItemDef(item),
            agPopups = this.agApi.contextMenuFactory.popupService.popupList,
            currentPopup = this.findCurrentContextMenuPopup(item),
            parentPopup = agPopups[agPopups.indexOf(currentPopup) - 1],
            agParentMenuList = this.getAgMenuList(parentPopup),
            parentItem = find(agParentMenuList?.eGui.childNodes, (it) => {
                return !!this.getItemDef(it)?.subMenu?.find(sm => sm == itemDef);
            });

        if (!parentItem) return;

        this.getAgMenuList(currentPopup).clearActiveItem();
        this.callAgMouseEnter(parentItem);
    }

    handleUpDownKey(evt) {
        const items = document.querySelectorAll('.ag-menu-option'),
            {key, target} = evt,
            incr = key == 'ArrowDown' ? 1 : -1;
        let nextTabIndex = target.tabIndex + incr;

        items.forEach((item, idx) => {
            if (this.getItemDef(item).disabled && item.tabIndex == nextTabIndex) {
                nextTabIndex += incr;
                idx += incr;
                item = items[idx];
            }

            if (item.tabIndex == nextTabIndex) this.callAgMouseEnter(item);
        });
    }

    handleEnterKey(evt) {
        evt.target.click();
        this.focusBackToGrid();
    }

    handleEscapeKey(evt) {
        this.closeAllGridContextMenus();
        this.focusBackToGrid();
    }

    focusBackToGrid() {
        const {agApi} = this,
            cell = agApi.getFocusedCell();

        agApi.setFocusedCell(cell.rowIndex, cell.column.colId);
    }

    findCurrentContextMenuPopup(item) {
        return this.agApi.contextMenuFactory.popupService.popupList.find(list => {
            const menu = list.element.childNodes[0];
            return !!find(menu.childNodes, (it) => it == item);
        });
    }

    getAgMenuList = (agPopup) => agPopup?.element.childNodes[0].__agComponent;

    hasSubMenu = (item) => this.getItemDef(item)?.subMenu?.length;

    getItemDef = (item) => item.__agComponent?.params;

    closeAllGridContextMenus(item) {
        const {activeMenu} = this.agApi.contextMenuFactory;
        activeMenu?.destroyFunctions.forEach(f => f());
    }
}