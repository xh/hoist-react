/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {elementFactory, containerElementFactory} from '@xh/hoist/core';
import ons from 'onsenui';
import 'onsenui/css/onsen-css-components.css';
import 'onsenui/css/onsenui.css';
import {
    BottomToolbar,
    Button,
    Checkbox,
    Dialog,
    GestureDetector,
    Input,
    ListItem,
    Navigator,
    Page,
    SearchInput,
    Select,
    Switch,
    Tab,
    Tabbar,
    Toast,
    Toolbar
} from 'react-onsenui';
import './styles.scss';
import './theme.scss';

ons.disableAutoStyling();

export {
    BottomToolbar,
    Button,
    Checkbox,
    Dialog,
    GestureDetector,
    Input,
    ListItem,
    Navigator,
    Page,
    SearchInput,
    Select,
    Switch,
    Tab,
    Tabbar,
    Toast,
    Toolbar
};


//-----------------
// Leaf Components
//-----------------
export const
    button = elementFactory(Button),
    checkbox = elementFactory(Checkbox),
    gestureDetector = elementFactory(GestureDetector),
    input = elementFactory(Input),
    navigator = elementFactory(Navigator),
    searchInput = elementFactory(SearchInput),
    select = elementFactory(Select),
    switchControl = elementFactory(Switch);


//---------------------
// Container Components
//----------------------
export const
    dialog = containerElementFactory(Dialog),
    listItem = containerElementFactory(ListItem),
    page = containerElementFactory(Page),
    tab = containerElementFactory(Tab),
    tabbar = containerElementFactory(Tabbar),
    toast = containerElementFactory(Toast),
    toolbar = containerElementFactory(Toolbar),
    bottomToolbar = containerElementFactory(BottomToolbar);
