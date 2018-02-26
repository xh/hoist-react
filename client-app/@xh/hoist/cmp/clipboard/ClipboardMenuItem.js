/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {ClipboardButton} from './ClipboardButton';
import {elemFactory} from 'hoist/react';
import {observer} from 'hoist/mobx';

@observer
class ClipboardMenuItem extends ClipboardButton {
    static buttonDefaults = {
        icon: 'clipboard',
        text: 'Copy',
        style: {
            display: 'flex',
            width: '100%',
            justifyContent: 'left'
        }
    }
}

export const clipboardMenuItem = elemFactory(ClipboardMenuItem);