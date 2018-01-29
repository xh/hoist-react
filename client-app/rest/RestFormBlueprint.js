/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {vbox, div} from 'hoist/layout';
import {observer, observable, action, computed} from 'hoist/mobx';
import {inputGroup, button, label, dialog} from 'hoist/kit/blueprint';
import {merge, isEmpty} from 'lodash';
import {XH} from 'hoist';

@observer
export class RestFormBlueprint extends Component {

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

        return dialog({
            iconName: 'inbox',
            isOpen: this.isOpen,
            onClose: this.onClose,
            title: this.isAdd ? 'Add Record' : 'Edit Record',
            items: [
                div({
                    cls: 'pt-dialog-body',
                    items: this.renderForm()
                }),
                div({
                    cls: 'pt-dialog-footer',
                    items: div({
                        cls: 'pt-dialog-footer-actions',
                        items: [
                            button({text: 'Save', iconName: 'tick', disabled: !this.isValid, onClick: this.onSubmit})
                        ]
                    })
                })
            ]
        });
    }

    renderForm() {
        const ret = [],
            editors = this.props.editors || [];

        editors.forEach(editor => {
            // need to incorporate a label prop in the editors
            // label should be able to be different from the name/field in rec
            // e.g. 'level' in logs should be labeled 'override'
            ret.push(label({text: editor.name}));
            ret.push(
                inputGroup({
                    placeholder: editor.name,
                    defaultValue: this.rec[editor.name] || '',
                    onChange: (e) => this.setCloneProp(editor.name, e.target.value),
                    type: editor.type || 'text',
                    disabled: editor.readOnly,
                    style: {marginBottom: 5}
                })
            );
        });

        return vbox({
            cls: 'rest-form',
            width: 400,
            padding: 10,
            items: ret
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    onSubmit = () => {
        const method = this.isAdd ? 'POST' : 'PUT';  // RestController's actions are mapped based on type of request. POST gets us Create, PUT gets us Update
        return XH.fetchJson({
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