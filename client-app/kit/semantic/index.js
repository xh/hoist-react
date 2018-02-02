/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import 'semantic-ui-css/semantic.min.css';

import {elemFactory} from 'hoist/hyperscript';

import {
    Button,
    Card,
    Dimmer,
    Dropdown,
    Form,
    Header,
    Input,
    Icon,
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
    dimmer = elemFactory(Dimmer),
    dropdown = elemFactory(Dropdown),
    form = elemFactory(Form),
    header = elemFactory(Header),
    icon = elemFactory(Icon),
    input = elemFactory(Input),
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
