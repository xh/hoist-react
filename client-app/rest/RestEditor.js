/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {div, h2, vbox} from 'hoist/layout';
import {observer, observable, action, toJS} from 'hoist/mobx';


@observer
export class RestForm extends Component {

    @observable rec = null;
    @observable isOpen = true;

    render() {
        if (this.isOpen) {
            return div({
                style: {
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    position: 'absolute',
                    top: '0',
                    left: '0'
                },
                onClick: this.onBackgroundClick.bind(this),
                items: [
                    vbox({
                        style: {
                            width: '300px',
                            height: '300px',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginTop: '-150px',
                            marginLeft: '-150px',
                            zIndex: '9999',
                            background: 'yellow'
                        },
                        onClick: this.onFormClick,
                        items: [
                            h2('Im a rest editor'),
                            h2('with fields and stuff')
                        ]
                    })
                ]
            });
        }
        return null;
    }

    @action
    updateRec(rec) {
        this.rec = rec;
    }

    @action
    onBackgroundClick() {
        this.isOpen = false;
    }

    @action
    componentWillReceiveProps(nextProps) {
        this.isOpen = true;
        this.rec = nextProps.rec;
    }

    onFormClick(e) {
        e.stopPropagation();
    }
}
