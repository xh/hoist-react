/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {vbox, div} from 'hoist/layout';
import {setter, observer, observable, action, computed} from 'hoist/mobx';
import {inputGroup, button, label, dialog} from 'hoist/kit/blueprint';
import {merge} from 'lodash';

@observer
export class RestFormBlueprint extends Component {

    @observable recClone = null;
    @setter @observable isOpen = true;


    @computed get isValid() {
        // how can we dynamically set the logic here? maybe loop through editors prop
        // and check its corresponding recClone values against the editors type property (or required/allowblank ect ect)?
        // maybe only validate the field that just changed to trigger this?
        return true;
    }

    render() {
        if (!this.props.rec || !this.isOpen) return null;

        const restModel = this.props.restModel;

        return dialog({
            iconName: 'inbox',
            isOpen: this.isOpen,
            onClose: this.close,
            title: restModel.isAdd ? 'Add Record' : 'Edit Record',
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
                            button({
                                text: 'Save',
                                iconName: 'tick',
                                disabled: !this.isValid,
                                onClick: () => restModel.saveRecord(this.recClone)
                            })
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
                    defaultValue: this.props.rec[editor.name] || '',
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
    close = () => {
        this.setIsOpen(false);
    }

    @action
    componentWillReceiveProps(nextProps) {
        this.setIsOpen(true);
        this.recClone = merge({}, nextProps.rec);
    }

    @action
    setCloneProp(prop, newVal) {
        this.recClone[prop] = newVal;
    }
}