/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import 'semantic-ui-css/semantic.min.css';

import {elemFactory} from 'hoist/hyperscript';
import {Loader,
    Button, ButtonContent,
    Card,
    Dimmer,
    Form,
    Header,
    Icon,
    Modal, ModalActions, ModalContent,
    TextArea
} from 'semantic-ui-react';

export const loader = elemFactory(Loader),
    button = elemFactory(Button),
    buttonContent = elemFactory(ButtonContent),
    card = elemFactory(Card),
    dimmer = elemFactory(Dimmer),
    form = elemFactory(Form),
    header = elemFactory(Header),
    icon = elemFactory(Icon),
    modal = elemFactory(Modal),
    modalActions = elemFactory(ModalActions),
    modalContent = elemFactory(ModalContent),
    textArea = elemFactory(TextArea);
