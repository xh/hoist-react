/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {elemFactory} from '@xh/hoist/core';

//--------------------
// Blueprint Imports
//--------------------
import {
    Alert,
    Button,
    Callout,
    Checkbox,
    ControlGroup,
    Dialog,
    FileInput,
    FormGroup,
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
    RangeSlider,
    Slider,
    Spinner,
    Switch,
    Tab,
    Tabs,
    TextArea,
    Text
} from '@blueprintjs/core';

import {DateInput} from '@blueprintjs/datetime';
import {Suggest, Select, Omnibar} from '@blueprintjs/select';

//---------------------
// Re-exports
//---------------------
export {
    Alert,
    Button,
    Callout,
    Checkbox,
    ControlGroup,
    DateInput,
    Dialog,
    FileInput,
    FormGroup,
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
    Omnibar,
    Overlay,
    Popover,
    RangeSlider,
    Select,
    Slider,
    Spinner,
    Suggest,
    Switch,
    Tab,
    Tabs,
    TextArea,
    Text
};

export const
    alert = elemFactory(Alert),
    button = elemFactory(Button),
    callout = elemFactory(Callout),
    controlGroup = elemFactory(ControlGroup),
    checkbox = elemFactory(Checkbox),
    dateInput = elemFactory(DateInput),
    dialog = elemFactory(Dialog),
    fileInput = elemFactory(FileInput),
    formGroup = elemFactory(FormGroup),
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
    omnibar = elemFactory(Omnibar),
    overlay = elemFactory(Overlay),
    popover = elemFactory(Popover),
    rangeSlider = elemFactory(RangeSlider),
    slider = elemFactory(Slider),
    select = elemFactory(Select),
    spinner = elemFactory(Spinner),
    suggest = elemFactory(Suggest),
    switchControl = elemFactory(Switch),
    tabs = elemFactory(Tabs),
    tab = elemFactory(Tab),
    text = elemFactory(Text),
    textArea = elemFactory(TextArea);