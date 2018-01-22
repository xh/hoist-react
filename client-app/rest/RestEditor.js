/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {div, hbox, filler, h2, vbox} from 'hoist/layout';
import {observer, observable, action, toJS} from 'hoist/mobx';
import {inputGroup, button} from 'hoist/blueprint';
import {elemFactory} from 'hoist';

@observer
export class RestForm extends Component {

    @observable rec = null;
    @observable isOpen = true;

    render() {
        if (this.rec && this.isOpen) {
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
                            padding: '10px',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginTop: '-300px',
                            marginLeft: '-150px',
                            zIndex: '9999',
                            background: 'darkgrey'
                        },
                        onClick: this.onFormClick,
                        items: this.buildForm()
                    })
                ]
            });
        }
        return null;
    }

    buildForm() {
        const ret = [],
            editors = this.props.editors;

        // should use editor properties to set specific input field types
        editors.forEach(it => {
            ret.push(
                inputGroup({
                    placeholder: it.name,
                    autoFocus: ret.length == 0,
                    value: this.rec[it.name] || '',
                    type: it.type || 'text',
                    onChange: () => {}, // inputGroup requires but no need for it at the moment
                    // readOnly: this.readOnly || false,
                    style: {marginBottom: 5}
                })
            );
        });

        ret.push(
            button({text: 'Submit', onClick: this.onSubmit})
        );
        // inputGroup({
        //     placeholder: 'Username...',
        //     autoFocus: true,
        //     value: this.username,
        //     onChange: this.onUsernameChange,
        //     style: {marginBottom: 5}
        // })
        return ret;
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    // onSubmit = (params) => {
    //     return XH.fetchJson({
    //         url: this.props.url,
    //         params: params // we'll see about this
    //     }).then(r => {
    //
    //     }).catch(() => {
    //
    //     });
    // }
    //
    // these will need to be generated dynamically. Input group requires handlers, but this general component doesn't know it's fields ahead of time
    // onUsernameChange = (ev) => {this.setUsername(ev.target.value)}
    // onPasswordChange = (ev) => {this.setPassword(ev.target.value)}
    
    onSubmit() {
        console.log('submitting');
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

export const restForm = elemFactory(RestForm);