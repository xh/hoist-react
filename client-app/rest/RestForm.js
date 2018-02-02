/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {observer} from 'hoist/mobx';
import {hoistAppModel} from 'hoist/app/HoistAppModel';

import {restFormBlueprint} from './RestFormBlueprint';
import {restFormSemantic} from './RestFormSemantic';

/**
 * Form for adding/editing pending records in RestGridModel.
 *
 * TODO:  Add support for read-only display and non-modal display?
 */
@observer
export class RestForm extends Component {
    render() {
        return hoistAppModel.useSemantic ?
            restFormSemantic(this.props):
            restFormBlueprint(this.props);
    }
}
export const restForm = elemFactory(RestForm);