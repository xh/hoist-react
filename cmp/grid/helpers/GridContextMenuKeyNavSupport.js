import {find} from 'lodash';

import {wait} from '@xh/hoist/promise';

/**
 * Support keyboard navigation on AG-Grid context menus and subMenus
 * This code adds keydown event handlers to menu items,
 * and in those handlers calls methods defined in AG-Grid's
 * https://github.com/ag-grid/ag-grid/blob/master/enterprise-modules/menu/src/menu/menuList.ts file
 * to activate/deactivate menuitems and their child menus.
 */
export class GridContextMenuKeyNavSupport {

    // see addHoverForChildPopup method in https://github.com/ag-grid/ag-grid/blob/master/enterprise-modules/menu/src/menu/menuList.ts#L102
    agGridHoverDelay = 300;

    agOptions;

    constructor(agOptions) {
        this.agOptions = agOptions;
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
        // when mousing over, focus on menu item
        // so that user can seamlessly switch between mouse and keyboard
        item.focus();
        if (!this.hasSubMenu(item)) return;

        // if menuitem has submenu, wait till it has been added to the dom,
        // and then add event handlers to the submenu items.
        wait(this.agGridHoverDelay).then(() => this.addEventHandlersToLatestMenu());
    }

    handleContextMenuKeyNavigation(evt) {
        const items = document.querySelectorAll('.ag-menu-option');
        let nextTabIndex = null;
        switch (evt.key) {
            case 'ArrowRight':  this.maybeGoToChildContextMenu(evt.target);     return;
            case 'ArrowLeft':   this.maybeFocusOnParentItem(evt.target);        return;
            case 'Enter':       evt.target.click();                             return;
            case 'Escape':      this.closeAllGridContextMenus(evt.target);      return;
            case 'ArrowDown':   nextTabIndex = evt.target.tabIndex + 1;         break;
            case 'ArrowUp':     nextTabIndex = evt.target.tabIndex - 1;         break;
        }

        items.forEach((item, idx) => {
            if (this.getItemDef(item).disabled && item.tabIndex == nextTabIndex) {
                evt.key == 'ArrowDown' ? ++nextTabIndex  : --nextTabIndex;
                evt.key == 'ArrowDown' ? ++idx  : --idx;
                item = items[idx];
            }

            if (item.tabIndex == nextTabIndex) this.callAgMouseEnter(item);
        });
    }

    callAgMouseEnter(item) {
        const agPopup = this.findCurrentContextMenuPopup(item);
        if (!agPopup) return;

        this.getAgMenuList(agPopup).mouseEnterItem(this.getItemDef(item), item.__agComponent);
        item.focus(); // needed to put focus on div that has tabindex for keydown event detection to work
    }

    maybeGoToChildContextMenu(item) {
        if (!this.hasSubMenu(item)) return;
        wait(this.agGridHoverDelay).then(() => this.addContextMenuKeyNavigation());
        // wait here is needed to wait for timeout used in showing submenus in AG-Grid
        // see addHoverForChildPopup method in https://github.com/ag-grid/ag-grid/blob/master/enterprise-modules/menu/src/menu/menuList.ts#L102
    }

    maybeFocusOnParentItem(item) {
        const itemDef = this.getItemDef(item),
            agPopups = this.agOptions.model.agApi.contextMenuFactory.popupService.popupList,
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

    findCurrentContextMenuPopup(item) {
        return this.agOptions.model.agApi.contextMenuFactory.popupService.popupList.find(list => {
            const menu = list.element.childNodes[0];
            return !!find(menu.childNodes, (it) => it == item);
        });
    }

    getAgMenuList = (agPopup) => agPopup?.element.childNodes[0].__agComponent;

    hasSubMenu = (item) => this.getItemDef(item)?.subMenu?.length;

    getItemDef = (item) => item.__agComponent?.params;

    closeAllGridContextMenus(item) {
        const {activeMenu} = this.agOptions.model.agApi.contextMenuFactory;
        activeMenu?.destroyFunctions.forEach(it => it());
    }
}