import {applyMixin} from '@xh/hoist/utils/js';


/**
 * Support keyboard navigation on AG-Grid context menus and subMenus
 * This code adds keydown event handlers to menu items,
 * and in those handlers calls methods defined in AG-Grid's
 * /node_modules/ag-grid-enterprise/dist/lib/menu/menuList.js file
 * to activate/deactivate menuitems and their child menus.
 */
export function XhGridContextMenuKeyNavSupport(C) {
    return applyMixin(C, {
        name: 'XhGridContextMenuKeyNavSupport',

        provides: {
            addContextMenuKeyNavigation() {
                let items;
                const addEventHandlers = () => {
                    items = document.querySelectorAll('.ag-popup:last-child .ag-menu-option');
                    const menuCount = document.querySelectorAll('.ag-popup').length,
                        base = menuCount * 1000;

                    items.forEach((item, idx) => {
                        item.setAttribute('tabindex', base + idx); // tabindex is what allows a div to be focusable for keydown event detection
                        item.addEventListener('keydown', (evt) => this.handleContextMenuKeyNavigation(evt));

                        // when mousing over, focus on menu item
                        // so that user can seamlessly switch between mouse and keyboard
                        item.addEventListener('mouseover', (evt) => {
                            const item = evt.target.closest('.ag-menu-option');
                            item.focus();
                            if (!this.hasSubMenu(item)) return;
                            setTimeout(() => addEventHandlers(), 300);
                        });

                    });
                };

                addEventHandlers();
                this.callAgMouseEnter(items[0]);
            },

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
                    if (item.__agComponent.params.disabled && item.tabIndex == nextTabIndex) {
                        evt.key == 'ArrowDown' ? ++nextTabIndex  : --nextTabIndex;
                        evt.key == 'ArrowDown' ? ++idx  : --idx;
                        item = items[idx];
                    }

                    if (item.tabIndex == nextTabIndex) this.callAgMouseEnter(item);
                });
            },

            callAgMouseEnter(item) {
                const agPopup = this.findCurrentContextMenuPopup(item);
                if (!agPopup) return;

                const agMenuList = agPopup.element.childNodes[0].__agComponent;

                agMenuList.mouseEnterItem(item.__agComponent.params, item.__agComponent);
                item.focus(); // needed to put focus on div that has tabindex for keydown event detection to work
            },

            maybeGoToChildContextMenu(item) {
                if (!this.hasSubMenu(item)) return;

                setTimeout(() => this.addContextMenuKeyNavigation(), 300);
                // timeout here is needed to wait for timeout used in showing submenus in AG-Grid
                // see addHoverForChildPopup method in /node_modules/ag-grid-enterprise/dist/lib/menu/menuList.js
            },

            maybeFocusOnParentItem(item) {
                const itemDef = item.__agComponent.params,
                    agPopups = this.agOptions.model.agApi.contextMenuFactory.popupService.popupList,
                    currentPopup = this.findCurrentContextMenuPopup(item),
                    currentAgMenuList = currentPopup.element.childNodes[0].__agComponent,
                    parentPopup = agPopups[agPopups.indexOf(currentPopup) - 1],
                    agParentMenuList = parentPopup?.element.childNodes[0].__agComponent;

                if (!agParentMenuList) return;

                let parentItemToFocus;
                agParentMenuList.eGui.childNodes.forEach(it => {
                    const nodeDef = it.__agComponent?.params;
                    if (nodeDef?.subMenu?.find(sm => sm == itemDef)) parentItemToFocus = it;
                });
                if (!parentItemToFocus) return;

                currentAgMenuList.clearActiveItem();
                this.callAgMouseEnter(parentItemToFocus);
            },

            findCurrentContextMenuPopup(item) {
                return this.agOptions.model.agApi.contextMenuFactory.popupService.popupList.find(list => {
                    const menu = list.element.childNodes[0];
                    let found = false;
                    menu.childNodes.forEach(it => {
                        if (it == item) found = true;
                    });
                    return found;
                });
            },

            hasSubMenu(item) {
                const {subMenu} = item.__agComponent.params;
                return subMenu?.length;
            },

            closeAllGridContextMenus(item) {
                const {activeMenu} = this.agOptions.model.agApi.contextMenuFactory;
                activeMenu?.destroyFunctions.forEach(it => it());
            }
        }
    });
}