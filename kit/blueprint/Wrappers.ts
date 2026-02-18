/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
//--------------------
// Blueprint Imports
//--------------------
import {
    Alert,
    Button,
    ButtonGroup,
    Callout,
    Card as BpCard,
    Checkbox,
    ControlGroup,
    Dialog as BpDialog,
    type DialogProps,
    Drawer,
    EditableText,
    FileInput,
    FormGroup,
    Hotkey,
    Hotkeys,
    InputGroup,
    Label,
    Menu,
    MenuDivider,
    MenuItem,
    Navbar,
    NavbarDivider,
    NavbarGroup,
    NavbarHeading,
    NumericInput,
    OverflowList,
    Overlay2 as Overlay,
    Popover as BpPopover,
    type PopoverProps,
    Radio,
    RadioGroup,
    RangeSlider,
    Slider,
    Switch,
    Tab,
    Tabs,
    Tag,
    TagInput,
    Text,
    TextArea,
    Tooltip,
    Tree
} from '@blueprintjs/core';
import {DatePicker} from '@blueprintjs/datetime';
import {elementFactory} from '@xh/hoist/core';
import React, {createElement as reactCreateElement} from 'react';

// Wrap Dialog and Popover to disable fade/scale-in transitions by default.
// See also popover & overlay related CSS overrides in ./styles.scss.
const Dialog: React.FC<DialogProps> = props =>
    reactCreateElement(BpDialog, {transitionDuration: 0, transitionName: 'none', ...props});

const Popover: React.FC<PopoverProps> = props =>
    reactCreateElement(BpPopover, {transitionDuration: 0, ...props});

//---------------------
// Re-exports
//---------------------
export {
    Alert,
    Button,
    ButtonGroup,
    Callout,
    BpCard,
    Checkbox,
    ControlGroup,
    DatePicker,
    Dialog,
    Drawer,
    EditableText,
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
    OverflowList,
    Overlay,
    Popover,
    Radio,
    RadioGroup,
    RangeSlider,
    Slider,
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

//----------------------------
// Primarily leaf Components
//-----------------------------
export const alert = elementFactory(Alert),
    button = elementFactory(Button),
    controlGroup = elementFactory(ControlGroup),
    checkbox = elementFactory(Checkbox),
    dialog = elementFactory(Dialog),
    datePicker = elementFactory(DatePicker),
    menuDivider = elementFactory(MenuDivider),
    menuItem = elementFactory(MenuItem),
    navbarDivider = elementFactory(NavbarDivider),
    numericInput = elementFactory(NumericInput),
    overflowList = elementFactory(OverflowList),
    popover = elementFactory(Popover),
    radio = elementFactory(Radio),
    rangeSlider = elementFactory(RangeSlider),
    slider = elementFactory(Slider),
    switchControl = elementFactory(Switch),
    textArea = elementFactory(TextArea),
    tree = elementFactory(Tree),
    tagInput = elementFactory(TagInput),
    fileInput = elementFactory(FileInput),
    overlay = elementFactory(Overlay),
    tooltip = elementFactory(Tooltip);

//-----------------------
// Container Components
//-----------------------
export const buttonGroup = elementFactory(ButtonGroup),
    callout = elementFactory(Callout),
    bpCard = elementFactory(BpCard),
    drawer = elementFactory(Drawer),
    editableText = elementFactory(EditableText),
    formGroup = elementFactory(FormGroup),
    hotkey = elementFactory(Hotkey),
    hotkeys = elementFactory(Hotkeys),
    inputGroup = elementFactory(InputGroup),
    label = elementFactory(Label),
    menu = elementFactory(Menu),
    navbar = elementFactory(Navbar),
    navbarHeading = elementFactory(NavbarHeading),
    navbarGroup = elementFactory(NavbarGroup),
    radioGroup = elementFactory(RadioGroup),
    tabs = elementFactory(Tabs),
    tab = elementFactory(Tab),
    tag = elementFactory(Tag),
    text = elementFactory(Text);
