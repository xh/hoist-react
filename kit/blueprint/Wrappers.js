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
    ButtonGroup,
    Callout,
    Card,
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
    Radio,
    RadioGroup,
    RangeSlider,
    Slider,
    Spinner,
    Switch,
    Tab,
    Tabs,
    Tag,
    TagInput,
    TextArea,
    Text,
    Tooltip,
    Tree
} from '@blueprintjs/core';

import {DateInput} from '@blueprintjs/datetime';

// TODO - if we could replace Omnibar (used in at least one client app) we could drop BP select dep.
// I think this could be worth doing, even if we picked up a more dedicated omnibar library...
import {MultiSelect, Omnibar, Select, Suggest} from '@blueprintjs/select';

//---------------------
// Re-exports
//---------------------
export {
    Alert,
    Button,
    ButtonGroup,
    Callout,
    Card,
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
    MultiSelect,
    Navbar,
    NavbarDivider,
    NavbarGroup,
    NavbarHeading,
    NumericInput,
    Omnibar,
    Overlay,
    Popover,
    Radio,
    RadioGroup,
    RangeSlider,
    Select,
    Slider,
    Spinner,
    Suggest,
    Switch,
    Tab,
    Tabs,
    Tag,
    TagInput,
    TextArea,
    Text,
    Tooltip,
    Tree
};

export const
    alert = elemFactory(Alert),
    button = elemFactory(Button),
    buttonGroup = elemFactory(ButtonGroup),
    callout = elemFactory(Callout),
    card = elemFactory(Card),
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
    multiSelect = elemFactory(MultiSelect),
    navbar = elemFactory(Navbar),
    navbarHeading = elemFactory(NavbarHeading),
    navbarGroup = elemFactory(NavbarGroup),
    navbarDivider = elemFactory(NavbarDivider),
    numericInput = elemFactory(NumericInput),
    omnibar = elemFactory(Omnibar),
    overlay = elemFactory(Overlay),
    popover = elemFactory(Popover),
    radio = elemFactory(Radio),
    radioGroup = elemFactory(RadioGroup),
    rangeSlider = elemFactory(RangeSlider),
    slider = elemFactory(Slider),
    select = elemFactory(Select),
    spinner = elemFactory(Spinner),
    suggest = elemFactory(Suggest),
    switchControl = elemFactory(Switch),
    tabs = elemFactory(Tabs),
    tab = elemFactory(Tab),
    tag = elemFactory(Tag),
    tagInput = elemFactory(TagInput),
    text = elemFactory(Text),
    textArea = elemFactory(TextArea),
    tooltip = elemFactory(Tooltip),
    tree = elemFactory(Tree);