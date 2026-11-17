/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {itemList} from '@xh/hoist/cmp/itemlist';
import {keyValueList} from '@xh/hoist/cmp/keyvaluelist';
import {span} from '@xh/hoist/cmp/layout';
import {XH} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {throwIfRowsPassedAsItems} from '@xh/hoist/utils/impl';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * A component that takes its rows in an array prop gets them as plain-object children when a
 * caller passes `items` instead. In development mode it must fail with a message that names the
 * right prop, rather than render nothing.
 */
describe('throwIfRowsPassedAsItems', () => {
    beforeAll(() => initTestAppAsync());

    const check = (children: any) => () => throwIfRowsPassedAsItems(children, 'entries', 'Cmp'),
        rows = [{label: 'Symbol', value: 'AAPL'}];

    // Tests run in production mode. Switch development mode on for one test.
    function setDevMode(value: boolean) {
        const was = XH.isDevelopmentMode;
        (XH as any).isDevelopmentMode = value;
        onTestFinished(() => {
            (XH as any).isDevelopmentMode = was;
        });
    }

    it('names the right prop when children hold plain objects', () => {
        setDevMode(true);
        expect(check(rows)).toThrow(/Cmp takes its rows in 'entries', not 'items'/);
    });

    it('checks nothing outside development mode', () => {
        setDevMode(false);
        expect(check(rows)).not.toThrow();
    });

    it('accepts no children, text and elements', () => {
        setDevMode(true);
        expect(check(null)).not.toThrow();
        expect(check('text')).not.toThrow();
        expect(check([span('a'), [span('b')]])).not.toThrow();
    });

    it.each([
        ['KeyValueList', () => keyValueList({items: [{label: 'Symbol', value: 'AAPL'}]} as any)],
        ['ItemList', () => itemList({items: [{title: 'Alert'}]} as any)]
    ])('%s checks for rows passed as items', (name, factory) => {
        setDevMode(true);
        // React logs the error thrown during render - keep the test output clean.
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        onTestFinished(() => spy.mockRestore());
        expect(() => render(factory())).toThrow(new RegExp(`${name} takes its rows in`));
    });
});
