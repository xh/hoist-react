/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import './styles.scss';

import {elemFactory} from 'hoist/core';
import {
    Alert,
    Button,
    Checkbox,
    ControlGroup,
    Dialog,
    Hotkeys,
    Hotkey,
    InputGroup,
    Label,
    Menu,
    MenuItem,
    MenuDivider,
    Navbar,
    NavbarDivider,
    NavbarGroup,
    NavbarHeading,
    NumericInput,
    Overlay,
    Popover,
    Spinner,
    Switch,
    Tab,
    Tabs,
    TextArea,
    Text
} from '@blueprintjs/core';

import {DateInput} from '@blueprintjs/datetime';
import {Suggest, Select} from '@blueprintjs/select';

export {
    ContextMenu,
    ContextMenuTarget,
    Classes,
    HotkeysTarget,
    Intent,
    Position,
    Toaster
} from '@blueprintjs/core';

export const
    alert = elemFactory(Alert),
    button = elemFactory(Button),
    controlGroup = elemFactory(ControlGroup),
    checkbox = elemFactory(Checkbox),
    dateInput = elemFactory(DateInput),
    dialog = elemFactory(Dialog),
    hotkey = elemFactory(Hotkey),
    hotkeys = elemFactory(Hotkeys),
    inputGroup = elemFactory(InputGroup),
    label = elemFactory(Label),
    menu = elemFactory(Menu),
    menuDivider = elemFactory(MenuDivider),
    menuItem = elemFactory(MenuItem),
    navbar = elemFactory(Navbar),
    navbarHeading = elemFactory(NavbarHeading),
    navbarGroup = elemFactory(NavbarGroup),
    navbarDivider = elemFactory(NavbarDivider),
    numericInput = elemFactory(NumericInput),
    overlay = elemFactory(Overlay),
    popover = elemFactory(Popover),
    select = elemFactory(Select),
    spinner = elemFactory(Spinner),
    suggest = elemFactory(Suggest),
    switchControl = elemFactory(Switch),
    tabs = elemFactory(Tabs),
    tab = elemFactory(Tab),
    text = elemFactory(Text),
    textArea = elemFactory(TextArea);

//------------------------
// Convenience Functions
//-------------------------

export const dialogBody = elemFactory('div', {cls: 'pt-dialog-body'});
export const dialogFooter = elemFactory('div', {cls: 'pt-dialog-footer'});
export const dialogFooterActions = elemFactory('div', {cls: 'pt-dialog-footer-actions'});
