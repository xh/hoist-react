/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {form, formFieldSet, FormFieldSetModel, FormModel} from '@xh/hoist/cmp/form';
import {div} from '@xh/hoist/cmp/layout';
import {type ElementFactory, hoistCmp, HoistModel, managed, uses} from '@xh/hoist/core';
import {required} from '@xh/hoist/data';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, render} from '@testing-library/react';
import {createRef, type ReactNode} from 'react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * A FormFieldSet registers with the set that encloses it in the component tree, and its fields
 * register with it. Validation display and disabled / readonly cascading depend on this. It must
 * work whether the component creates the set's model or an app passes one in.
 */
describe('FormFieldSet', () => {
    beforeAll(() => initTestAppAsync());

    // Fixed in v89 - a set passed its model became its own parent, a MobX cycle on render.
    describe('with an explicit model', () => {
        it('renders with no parent when not nested', () => {
            const {contact} = renderAccountForm(m => fieldSet(m.contact, 'name'));

            expect(contact.parent).toBeFalsy();
            expect(contact.disabled).toBeFalsy();
        });

        it('takes the enclosing set as its parent, not itself', () => {
            const {account, contact} = renderAccountForm(m =>
                formFieldSet({model: m.account, item: fieldSet(m.contact, 'name')})
            );

            expect(contact.parent).toBe(account);
            expect(account.parent).toBeFalsy();
        });

        it('is the parent of an implicit set nested within it', () => {
            const innerRef = createRef<FormFieldSetModel>(),
                {account} = renderAccountForm(m =>
                    formFieldSet({
                        model: m.account,
                        item: formFieldSet({
                            modelRef: innerRef,
                            item: formField({field: 'name', item: textInput()})
                        })
                    })
                );

            expect(innerRef.current.parent).toBe(account);
        });

        it('takes an enclosing implicit set as its parent', () => {
            const outerRef = createRef<FormFieldSetModel>(),
                {contact} = renderAccountForm(m =>
                    formFieldSet({modelRef: outerRef, item: fieldSet(m.contact, 'name')})
                );

            expect(contact.parent).toBe(outerRef.current);
        });

        it('shows validation for the fields it contains', async () => {
            const {account, contact, formModel} = renderAccountForm(m =>
                formFieldSet({model: m.account, item: fieldSet(m.contact, 'name')})
            );

            await act(() => formModel.validateAsync({display: true}));

            expect(contact.displayedSeverity).toBe('error');
            expect(account.displayedSeverity).toBe('error');
        });

        it('disables its fields and the sets nested within it', () => {
            const {account, contact, container} = renderAccountForm(m =>
                formFieldSet({model: m.account, item: fieldSet(m.contact, 'name')})
            );

            act(() => account.setDisabled(true));

            expect(contact.disabled).toBe(true);
            expect(inputFor(container, 'name').disabled).toBe(true);
        });
    });

    // A published app model holds several sets. Each set and field must still register with the
    // set that encloses it in the component tree, not with another set on that model.
    describe('with sets held by a published app model', () => {
        it('does not take a sibling set as its parent', async () => {
            const {contact, billing, formModel, container} = renderAccountPanel(m =>
                div(fieldSet(m.contact, 'name'), fieldSet(m.billing, 'cardNumber'))
            );

            act(() => billing.setDisabled(true));
            await act(() => formModel.validateAsync({display: true}));

            expect(contact.parent).toBeFalsy();
            expect(billing.parent).toBeFalsy();
            expect(contact.displayedSeverity).toBe('error');
            expect(billing.displayedSeverity).toBeNull();
            expect(inputFor(container, 'name').disabled).toBe(false);
            expect(inputFor(container, 'cardNumber').disabled).toBe(true);
        });

        it('does not register fields outside it', async () => {
            const {account, contact, billing, formModel, container} = renderAccountPanel(m =>
                div(
                    formField({field: 'name', item: textInput()}),
                    fieldSet(m.billing, 'cardNumber')
                )
            );
            const sets = [account, contact, billing];

            act(() => sets.forEach(it => it.setDisabled(true)));
            await act(() => formModel.validateAsync({display: true}));

            sets.forEach(it => expect(it.displayedSeverity).toBeNull());
            expect(inputFor(container, 'name').disabled).toBe(false);
            expect(inputFor(container, 'cardNumber').disabled).toBe(true);
        });
    });
});

//------------------
// Test fixtures
//------------------
/** An app model that creates sets to pass to formFieldSet(), as the documented pattern does. */
class AccountModel extends HoistModel {
    @managed formModel = new FormModel({
        fields: [
            {name: 'name', rules: [required]},
            {name: 'cardNumber', rules: [required], initialValue: '4111'}
        ]
    });
    @managed account = new FormFieldSetModel();
    @managed contact = new FormFieldSetModel();
    @managed billing = new FormFieldSetModel();
}

/** Publishes its model in the default mode, as an app panel usually does. */
const accountPanel = hoistCmp.factory<AccountModel>({
    model: uses(AccountModel),
    render: ({model, children}) => accountForm({model, items: children})
});

const accountForm = hoistCmp.factory<AccountModel>({
    model: false,
    render: ({model, children}) =>
        form({model: model.formModel, testId: 'account', items: children})
});

/** Render a form with no app model in context. */
function renderAccountForm(content: (m: AccountModel) => ReactNode) {
    return renderAccount(content, accountForm);
}

/** Render a form within a panel that publishes its app model. */
function renderAccountPanel(content: (m: AccountModel) => ReactNode) {
    return renderAccount(content, accountPanel);
}

function renderAccount(content: (m: AccountModel) => ReactNode, factory: ElementFactory) {
    const model = new AccountModel();
    onTestFinished(() => model.destroy());

    const {container} = render(factory({model, item: content(model)})),
        {formModel, account, contact, billing} = model;
    return {formModel, account, contact, billing, container};
}

function fieldSet(model: FormFieldSetModel, field: string) {
    return formFieldSet({model, item: formField({field, item: textInput()})});
}

function inputFor(container: HTMLElement, field: string): HTMLInputElement {
    return container.querySelector(`input[data-testid="account-${field}-input"]`);
}
