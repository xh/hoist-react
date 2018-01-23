/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {React, Component} from 'react';
import {div, hbox, filler, h1, vbox} from 'hoist/layout';
import {observer, observable, action, computed, toJS} from 'hoist/mobx';
import {inputGroup, button, label} from 'hoist/blueprint';
import {merge} from 'lodash';
import {XH, elemFactory} from 'hoist';

@observer
export class RestForm extends Component {

    @observable rec = null;
    @observable recClone = null;
    @observable isOpen = true;

    @computed get isValid() {
        // how can we dynamically set the logic here? maybe loop through editors prop
        // and check it's corresponding value against the editors type property (or required/allowblank ect ect) in the recClone?
        return true;
    }

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
                onClick: this.closeForm.bind(this),
                items: [
                    vbox({
                        cls: 'rest-form',
                        style: {
                            width: '400px',
                            padding: '10px',
                            position: 'absolute',
                            left: '50%',
                            marginTop: '50px',
                            marginLeft: '-150px',
                            zIndex: '9999',
                            background: 'darkgrey'
                        },
                        onClick: this.onFormClick,
                        items: this.renderForm()
                    })
                ]
            });
        }
        return null;
    }

    renderForm() {
        const ret = [],
            editors = this.props.editors;

        ret.push(
            hbox({
                cls: 'rest-form-header',
                items: [
                    h1(this.props.title),
                    filler(),
                    button({onClick: this.closeForm.bind(this), text: 'Close'})
                ]
            })
        );

        // should use editor properties to set specific input field types
        editors.forEach(it => {
            ret.push(
                label({
                    text: it.name
                }),
                inputGroup({
                    placeholder: it.name,
                    defaultValue: this.rec[it.name] || '',
                    onChange: (ev) => this.setCloneProp(it.name, ev.target.value), // needs to be an action
                    type: it.type || 'text',
                    disabled: it.readOnly,
                    style: {marginBottom: 5}
                })
            );
        });

        ret.push(
            hbox({
                items: [
                    filler(),
                    button({text: 'Submit', disabled: !this.isValid, onClick: this.onSubmit.bind(this)}) // 'this' was undefined? What gives? Lee defined as fat arrow, could work for other binding probs
                ]
            })
        );

        return ret;
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    onSubmit() {
        console.log('submitting');
        return XH.fetchJson({
            url: this.props.url,
            method: 'POST',  // PUT?
            data: this.recClone
        }).then(r => {
            console.log(r);
        }).catch((e) => {
            console.log(e);
        });
    }
    
    @action
    closeForm() {
        this.isOpen = false;
    }

    @action
    componentWillReceiveProps(nextProps) {
        this.isOpen = true;
        this.rec = nextProps.rec;
        this.recClone = merge({}, this.rec);
    }


    // probably don't actually need. Fires before render. Return false to not
    shouldComponentUpdate(nextProps, nextState) {
        return true;
    }

    onFormClick(e) {
        e.stopPropagation();
    }

    @action
    setCloneProp(prop, newVal) {
        this.recClone[prop] = newVal;
    }

}

export const restForm = elemFactory(RestForm);