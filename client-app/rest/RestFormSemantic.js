/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH} from 'hoist';
import {vbox} from 'hoist/layout';
import {observer, observable, action, computed} from 'hoist/mobx';
import {button, input, modal, modalContent, modalActions, modalHeader} from 'hoist/kit/semantic';
import {merge, isEmpty} from 'lodash';

@observer
export class RestFormSemantic extends Component {

    @observable rec = null;
    @observable recClone = null;
    @observable isOpen = true;

    @computed get isAdd() {
        return isEmpty(this.rec);
    }

    @computed get isValid() {
        // how can we dynamically set the logic here? maybe loop through editors prop
        // and check its corresponding recClone values against the editors type property (or required/allowblank ect ect)?
        // maybe only validate the field that just changed to trigger this?
        return true;
    }

    render() {
        if (!this.rec || !this.isOpen) return null;

        return modal({
            open: true,
            onClose: this.onClose,
            closeIcon: true,
            size: 'small',
            items: [
                modalHeader(this.isAdd ? 'Add Record' : 'Edit Record'),
                modalContent(this.renderForm()),
                modalActions(
                    button({
                        content: 'Save',
                        icon: {name: 'check', color: 'green'},
                        compact: true,
                        disabled: !this.isValid,
                        onClick: this.onSubmit
                    })
                )
            ]
        });
    }

    renderForm() {
        const editors = this.props.editors || [];

        const ret = editors.map(editor => {
            // need to incorporate a label prop in the editors
            // label should be able to be different from the name/field in rec
            // e.g. 'level' in logs should be labeled 'override'
            return input({
                placeholder: editor.name,
                defaultValue: this.rec[editor.name] || '',
                onChange: (e) => this.setCloneProp(editor.name, e.target.value),
                type: editor.type || 'text',
                label: {content: editor.name, style: {width: '115px', verticalAlign: 'middle'}},
                disabled: editor.readOnly,
                style: {marginBottom: 5}
            });
        });

        return vbox({
            cls: 'rest-form',
            padding: 10,
            items: ret
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    onSubmit = () => {
        const method = this.isAdd ? 'POST' : 'PUT';  // RestController's actions are mapped based on type of request. POST gets us Create, PUT gets us Update
        XH.fetchJson({
            url: this.props.url,
            method: method,
            params: {data: JSON.stringify(this.recClone)} // for update maybe only send dirty fields
        }).then(resp => {
            this.props.updateRows(resp.data, method);
            this.onClose();
        }).catchDefault();
    }

    @action
    onClose = () => {
        this.isOpen = false;
    }

    @action
    componentWillReceiveProps(nextProps) {
        this.isOpen = true;
        this.rec = nextProps.rec;
        this.recClone = merge({}, this.rec);
    }

    @action
    setCloneProp(prop, newVal) {
        this.recClone[prop] = newVal;
    }
}