/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

// Restore when using SUI components
// import 'semantic-ui-css/semantic.min.css';

import {elemFactory} from 'hoist';
import {defaults} from 'lodash';

import {
    Button,
    Card,
    Checkbox,
    Dimmer,
    Dropdown,
    Form,
    Header,
    Input,
    Icon,
    Label,
    Loader,
    Popup,
    Menu,
    Modal,
    Tab,
    TextArea
} from 'semantic-ui-react';

export const
    button = elemFactory(Button),
    buttonContent = elemFactory(Button.Content),
    card = elemFactory(Card),
    checkbox = elemFactory(Checkbox),
    dimmer = elemFactory(Dimmer),
    dropdown = elemFactory(Dropdown),
    form = elemFactory(Form),
    header = elemFactory(Header),
    icon = elemFactory(Icon),
    input = elemFactory(Input),
    label = elemFactory(Label),
    loader = elemFactory(Loader),
    menu = elemFactory(Menu),
    modal = elemFactory(Modal),
    modalActions = elemFactory(Modal.Actions),
    modalContent = elemFactory(Modal.Content),
    modalHeader = elemFactory(Modal.Header),
    popup = elemFactory(Popup),
    tab = elemFactory(Tab),
    tabPane = elemFactory(Tab.Pane),
    textArea = elemFactory(TextArea);


// TODO:  how to establish defaults like this appropriately for hoist and apps.

export function hoistButton(args) {
    defaults(args, {labelPosition: 'left', size: 'tiny', compact: true});
    return button(args);
}
