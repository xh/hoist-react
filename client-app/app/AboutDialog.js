/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {observer} from 'hoist/mobx';
import {alert} from 'hoist/kit/blueprint';
import {hoistAppModel} from './HoistAppModel';

@observer
export class AboutDialog extends Component {
    render() {
        return alert({
            isOpen: this.props.isOpen,
            icon: 'info-sign',
            cls: hoistAppModel.darkTheme ? 'xh-dark' : '',
            item: 'About This Application....',
            confirmButtonText: 'OK',
            onConfirm: this.onConfirm
        });
    }

    onConfirm = () => {
        hoistAppModel.setShowAbout(false);
    }
}
export const aboutDialog = elemFactory(AboutDialog);