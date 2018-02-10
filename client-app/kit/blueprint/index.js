/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';

import {elemFactory} from 'hoist/react';
import {
    Button,
    Checkbox,
    ControlGroup,
    Dialog,
    Icon,
    InputGroup,
    Label,
    MenuItem,
    Navbar,
    NavbarDivider,
    NavbarGroup,
    NavbarHeading,
    NumericInput,
    Overlay,
    Popover,
    Spinner,
    Tab,
    Tabs,
    TextArea,
    Text
} from '@blueprintjs/core';

import {Suggest, Select} from '@blueprintjs/select';
export {Classes} from '@blueprintjs/core';

export const button = elemFactory(Button),
    controlGroup = elemFactory(ControlGroup),
    checkbox = elemFactory(Checkbox),
    dialog = elemFactory(Dialog),
    icon = elemFactory(Icon),
    inputGroup = elemFactory(InputGroup),
    label = elemFactory(Label),
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
    tabs = elemFactory(Tabs),
    tab = elemFactory(Tab),
    text = elemFactory(Text),
    textArea = elemFactory(TextArea);

//------------------------
// Convenience Functions
//-------------------------

export const dialogBody = elemFactory('div', {cls: 'pt-dialog-body'});
export const dialogFooter = elemFactory('div', {cls: 'pt-dialog-body'});
export const dialogFooterActions = elemFactory('div', {cls: 'pt-dialog-footer-actions'});