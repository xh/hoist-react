/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import './styles.css';

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {grid} from 'hoist/grid';
import {observer} from 'hoist/mobx';
import {frame, vframe} from 'hoist/layout';

import {restGridToolbar} from './RestGridToolbar';
import {restForm} from './RestForm';

@observer
export class RestGrid extends Component {

    render() {
        const model = this.model;
        return vframe(
            restGridToolbar({model}),
            frame(
                grid({
                    model,
                    gridOptions: {
                        onRowDoubleClicked: this.onRowDoubleClicked
                    }
                })
            ),
            restForm({model})
        );
    }

    //------------------------
    // Implementation
    //------------------------
    get model() {return this.props.model}

    onRowDoubleClicked = (row) => {
        this.model.openEditForm(row.data);
    }
}
export const restGrid = elemFactory(RestGrid);