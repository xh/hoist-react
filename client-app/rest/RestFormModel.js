/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {forOwn} from 'lodash';
import {observable, computed, action} from 'hoist/mobx';
import {Classes, checkbox, inputGroup, label, menuItem, numericInput, suggest, textArea} from 'hoist/kit/blueprint';
import {span, vbox} from 'hoist/layout';
import {fmtDateTime} from 'hoist/format';
import {ConfirmModel} from 'hoist/cmp/confirm/ConfirmModel';

export class RestFormModel {

    //---------------
    // Properties
    //---------------
    editors = [];
    editWarning = null;
    parentModel = null;

    confirmModel = new ConfirmModel();

    // If not null, this will be displayed in a modal dialog
    @observable formRecord = null;

    @computed
    get formIsAdd() {
        const rec = this.formRecord;
        return (rec && rec.id === null);
    }

    @computed
    get formIsValid() {
        const fieldSpecs = this.parentModel.recordSpec.fields;
        let valid = true;
        forOwn(this.formRecord, (v, k) => {
            const spec = fieldSpecs.find(it => it.name === k);
            if (spec && !spec.allowNull && (v == null || v === '')) valid = false;
        });
        return valid;
    }

    @computed
    get formIsWritable() {
        const {formIsAdd} = this,
            {enableAdd, enableEdit} = this.parentModel;
        return (formIsAdd && enableAdd) || (!formIsAdd  && enableEdit);
    }

    constructor({
        editors,
        editWarning,
        parentModel
    }) {
        this.editors = editors;
        this.editWarning = editWarning;
        this.parentModel = parentModel;
    }

    getForm() {
        const {editors, formRecord} = this,
            fields = this.parentModel.recordSpec.fields,
            items = [];

        editors.forEach(editor => {
            const fieldSpec = fields.find(it => it.name === editor.field);
            if (fieldSpec.typeField) fieldSpec.type = this.getTypeFromValueField(formRecord, fields, fieldSpec);

            const inputConfig = this.getInputConfig(fieldSpec, editor, formRecord);

            items.push(this.createFieldLabel(inputConfig));
            switch (inputConfig.type) {
                case 'display':
                    items.push(this.createDisplayField(inputConfig));
                    break;
                case 'dropdown':
                    items.push(this.createDropdown(inputConfig));
                    break;
                case 'boolean':
                    items.push(this.createCheckbox(inputConfig));
                    break;
                case 'number':
                    items.push(this.createNumberInput(inputConfig));
                    break;
                case 'textarea':
                    items.push(this.createTextAreaInput(inputConfig));
                    break;
                case 'text':
                default:
                    items.push(this.createTextInput(inputConfig));
            }
        });

        return vbox({
            cls: 'rest-form',
            width: 400,
            padding: 10,
            items
        });
    }


    //----------------
    // Implementation
    //----------------
    createFieldLabel(config) {
        const fieldSpec = config.fieldSpec,
            editor = config.editor,
            text = fieldSpec.label || fieldSpec.name,
            suffix = (editor.additionsOnly && config.defaultValue) ? '(Read Only)' : '';
        return label({text: text + suffix, style: {width: '115px', marginBottom: 5}});
    }

    createDisplayField(config) {
        if (['lastUpdated', 'dateCreated'].includes(config.fieldSpec.name)) config.defaultValue = fmtDateTime(config.defaultValue);
        return span({item: config.defaultValue, style: {marginBottom: 10, padding: '5 0'}});
    }

    createDropdown(config) {
        const options = config.fieldSpec.lookupValues,
            handler = this.getMemoizedHandler(config);

        // 'hack' to allow additions(not built in), overrides itemPredicate, see note above handleAdditions function
        // const itemListPredicate = config.editor.allowAdditions ? this.handleAdditions : null;

        return suggest({
            className: 'rest-form-dropdown-blueprint',
            popoverProps: {popoverClassName: Classes.MINIMAL},
            // itemListPredicate: itemListPredicate,
            itemPredicate: (q, v, index) => !v || v.includes(q),
            $items: options,
            onItemSelect: handler,
            itemRenderer: (item, itemProps) => {
                return menuItem({key: item, onClick: itemProps.handleClick, text: item}); // can I use handleClick to update inputField's display
            },
            inputValueRenderer: s => s,
            inputProps: { // TODO: still allowing additions without adding to the drop down.
                defaultValue: config.defaultValue,
                // TODO need to somehow set current value on visible component
                // maybe helpful: you can pass value and onChange here to override Suggest's own behavior. might help with addtions
                value: undefined, // console warning dictated this undefined if I want to use default val
                style: {marginBottom: 5},
                disabled: config.isDisabled
            }
        });
    }

    createCheckbox(config) {
        const handler = this.getMemoizedHandler(config);

        return checkbox({
            defaultChecked: config.defaultValue,
            onChange: handler,
            disabled: config.isDisabled
        });
    }

    createNumberInput(config) {
        const handler = this.getMemoizedHandler(config);
        return numericInput({
            style: {marginBottom: 10},
            value: config.defaultValue,
            onValueChange: handler,
            disabled: config.isDisabled
        });
    }

    createTextAreaInput(config) {
        const handler = this.getMemoizedHandler(config);
        return textArea({
            style: {marginBottom: 10},
            defaultValue: config.defaultValue,
            onChange: handler,
            disabled: config.isDisabled
        });
    }

    createTextInput(config) {
        const handler = this.getMemoizedHandler(config);
        return inputGroup({
            style: {marginBottom: 10},
            defaultValue: config.defaultValue,
            onChange: handler,
            type: 'text',
            disabled: config.isDisabled
        });
    }

    //------------
    // Utils
    //------------
    getTypeFromValueField(formRecord, fields, fieldSpec) {
        return formRecord[fields.find(it => it.name === fieldSpec.typeField).name];
    }


    getInputConfig(fieldSpec, editor, formRecord) {
        const defaultValue = formRecord[fieldSpec.name],
            isDisabled = fieldSpec.readOnly || (editor.additionsOnly && !this.formIsAdd);

        return {
            editor: editor,
            fieldSpec: fieldSpec,
            field: fieldSpec.name,
            defaultValue: defaultValue == null ? '' : defaultValue,
            type: this.getInputType(fieldSpec, editor),
            isDisabled: isDisabled
        };
    }

    getInputType(fieldSpec, editor) {
        if (editor.type === 'displayField') return 'display';
        if (fieldSpec.lookupValues) return 'dropdown';
        if (fieldSpec.type === 'bool' || fieldSpec.type === 'boolean') return 'boolean';
        if (fieldSpec.type === 'int') return 'number';
        if (editor.type === 'textarea' || fieldSpec.type === 'json') return 'textarea';
        return 'text';
    }

    getMemoizedHandler(config) {
        const type = config.type,
            field = config.field,
            handlerName = type + field + 'Handler'; // including type allows for new handlers to be created for fields whose type may change e.g. config's prodValue

        if (this[handlerName]) return this[handlerName];

        const handler = (valOrEvent) => {
            let val = valOrEvent;
            if (typeof valOrEvent === 'object') val = valOrEvent.target.value;
            if (type === 'boolean') val = valOrEvent.target.checked;
            this.setFormValue(field, val);
        };

        this[handlerName] = handler;
        return handler;
    }

    // one problem is that this fires on each keystroke, makes for a funky list of choices, ie: n, ne, new
    // input group allows input without this, it's just not added to the dropdown or set as the value
    // once the general value setting problem is solved this may be unneeded
    handleAdditions(query, list, index) {
        if (query && !list.includes(query)) list.push(query);
        const ret = list.filter(it => it.includes(query));
        return query ? ret : list;
    }

    //-----------------
    // Actions
    //-----------------
    @action
    closeForm() {
        this.formRecord = null;
    }

    @action
    openAddForm() {
        const newRec = {id: null},
            fieldSpecs = this.parentModel.recordSpec.fields;

        // must start with full formed dummy rec for validation purposes
        // from MobX: a computed property won't re-run if none of the data used in the previous computation changed.
        fieldSpecs.forEach(spec => {
            newRec[spec.name] = null;
        });

        this.formRecord = newRec;
    }

    @action
    openEditForm(rec)  {
        this.formRecord = Object.assign({}, rec);
    }

    @action
    setFormValue = (field, value) => {
        this.formRecord[field] = value;
    }

}