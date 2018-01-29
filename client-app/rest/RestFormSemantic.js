/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {vbox} from 'hoist/layout';
import {setter, observer, observable, action, computed} from 'hoist/mobx';
import {button, input, modal, modalContent, modalActions, modalHeader} from 'hoist/kit/semantic';
import {merge} from 'lodash';

@observer
export class RestFormSemantic extends Component {

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

        return modal({
            open: true,
            onClose: this.close,
            closeIcon: true,
            size: 'small',
            items: [
                modalHeader(restModel.isAdd ? 'Add Record' : 'Edit Record'),
                modalContent(this.renderForm()),
                modalActions(
                    button({
                        content: 'Save',
                        icon: {name: 'check', color: 'green'},
                        compact: true,
                        disabled: !this.isValid,
                        onClick: () => restModel.saveRecord(this.recClone)
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
                defaultValue: this.props.rec[editor.name] || '',
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