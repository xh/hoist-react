/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Menu} from '@base-ui/react/menu';
import type {Separator} from '@base-ui/react/separator';
import {type ElementFactory, elementFactory} from '@xh/hoist/core';

//---------------------
// Re-exports
//---------------------
export {Menu};

/** Locale-aware string matching, as used by the built-in filter of `Menu.FilterProvider`. */
export const useMenuFilter = Menu.useFilter;

//---------------------
// Menu parts
//---------------------
export const menuFilterProvider = elementFactory(Menu.FilterProvider),
    menuRoot = elementFactory(Menu.Root),
    menuTrigger = elementFactory(Menu.Trigger),
    menuPortal = elementFactory(Menu.Portal),
    menuPositioner = elementFactory(Menu.Positioner),
    menuPopup = elementFactory(Menu.Popup),
    menuInput = elementFactory(Menu.Input),
    menuClear = elementFactory(Menu.Clear),
    menuEmpty = elementFactory(Menu.Empty),
    menuList = elementFactory(Menu.List),
    menuItem = elementFactory(Menu.Item),
    menuSubmenuRoot = elementFactory(Menu.SubmenuRoot),
    menuSubmenuTrigger = elementFactory(Menu.SubmenuTrigger),
    menuGroup = elementFactory(Menu.Group),
    menuGroupLabel = elementFactory(Menu.GroupLabel),
    menuSeparator: ElementFactory<Separator.Props> = elementFactory(Menu.Separator);
