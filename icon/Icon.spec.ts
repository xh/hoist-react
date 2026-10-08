/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    faDragon as faDragonSolid,
    faUnicorn as faUnicornSolid
} from '@fortawesome/pro-solid-svg-icons';
import {library} from '@fortawesome/fontawesome-svg-core';
import {faBurrito, faCactus, faFileInvoiceDollar, faTaco} from '@fortawesome/pro-regular-svg-icons';
import {faFileInvoiceDollar as faFileInvoiceDollarSolid} from '@fortawesome/pro-solid-svg-icons';
import {Icon} from '@xh/hoist/icon';
import {describe, expect, it, vi} from 'vitest';

/**
 * The icon registration API: how apps add their own FontAwesome icons, how names resolve to icons,
 * and what the catalog behind `IconPicker` lists. Apps persist icon names chosen by users and
 * render them back with `Icon.get()`, so name resolution must stay stable.
 *
 * Registrations live on the `Icon` singleton for the rest of the file, so each test registers
 * under its own name.
 */
describe('Icon', () => {
    describe('register', () => {
        it('returns a factory for the icon and installs it on Icon', () => {
            const invoice = Icon.register({
                name: 'invoice',
                defs: [faFileInvoiceDollar, faFileInvoiceDollarSolid]
            });

            expect(invoice().props.faName).toBe('file-invoice-dollar');
            expect((Icon as any).invoice).toBe(invoice);
            expect(Icon.get('invoice').props.faName).toBe('file-invoice-dollar');
            expect(Icon.get('file-invoice-dollar').props.faName).toBe('file-invoice-dollar');
        });

        it('renders the default weight when asked for a weight the app did not import', () => {
            const taco = Icon.register({name: 'taco', defs: faTaco}),
                dragon = Icon.register({name: 'dragon', defs: faDragonSolid});

            expect(taco({prefix: 'fas'}).props.prefix).toBe('far');
            expect(dragon().props.prefix).toBe('fas');
            expect(dragon({prefix: 'fal'}).props.prefix).toBe('fas');
        });

        it('renders an imported weight when asked for it', () => {
            const receipt = Icon.register({
                name: 'receipt2',
                defs: [faFileInvoiceDollar, faFileInvoiceDollarSolid]
            });

            expect(receipt().props.prefix).toBe('far');
            expect(receipt({prefix: 'fas'}).props.prefix).toBe('fas');
        });

        it('keeps an existing icon on a name conflict, and warns', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}),
                factory = Icon.register({name: 'search', faName: 'file-invoice-dollar'});

            expect(warn).toHaveBeenCalledOnce();
            expect(Icon.search().props.faName).toBe('magnifying-glass');
            expect(Icon.get('search').props.faName).toBe('magnifying-glass');
            // The returned factory still renders the new icon.
            expect(factory().props.faName).toBe('file-invoice-dollar');
        });

        it('leaves a refused registration out of the catalog, with a working factory', () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            const factory = Icon.register({name: 'search', defs: faUnicornSolid});

            expect(Icon.exists('unicorn')).toBe(false);
            expect(factory({prefix: 'far'}).props.prefix).toBe('fas');
        });

        it('replaces an existing icon, including a Hoist alias, when passed replace', () => {
            const edit = Icon.register({
                name: 'edit',
                faName: 'file-invoice-dollar',
                replace: true
            });

            expect(Icon.edit).toBe(edit);
            expect(Icon.edit().props.faName).toBe('file-invoice-dollar');
            expect(Icon.get('edit').props.faName).toBe('file-invoice-dollar');
            expect(Icon.getCatalogEntry('pen-to-square').names).not.toContain('edit');
            // Other names for the replaced glyph are unaffected.
            expect(Icon.penToSquare().props.faName).toBe('pen-to-square');
        });

        it('re-points Hoist aliases of a replaced icon, by name and in the catalog', () => {
            Icon.register({name: 'xCircle', faName: 'file-invoice-dollar', replace: true});

            // `danger` delegates to `xCircle`.
            expect(Icon.danger().props.faName).toBe('file-invoice-dollar');
            expect(Icon.get('danger').props.faName).toBe('file-invoice-dollar');
            expect(Icon.getCatalogEntry('file-invoice-dollar').names).toContain('danger');
            expect(Icon.getCatalogEntry('times-circle').names).not.toContain('danger');
        });

        it('updates a repeated registration without warning, as on hot reload', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}),
                first = Icon.register({name: 'bill', defs: faFileInvoiceDollar}),
                second = Icon.register({name: 'bill', defs: faFileInvoiceDollar});

            expect(warn).not.toHaveBeenCalled();
            expect((Icon as any).bill).toBe(second);
            expect(first).not.toBe(second);
        });

        it('applies baked-in props only to its own factory', () => {
            const urgent = Icon.register({
                name: 'urgentInvoice',
                faName: 'file-invoice-dollar',
                props: {intent: 'danger', className: 'urgent'}
            });

            expect(urgent().props.className).toBe('urgent xh-intent-danger');
            expect(urgent({className: 'big'}).props.className).toBe('urgent big xh-intent-danger');
            expect(Icon.get('file-invoice-dollar').props.className).toBeFalsy();
        });

        it('rejects a name that is a method of Icon', () => {
            expect(() => Icon.register({name: 'get', faName: 'plus'})).toThrow(/method of Icon/);
        });

        it('rejects defs for more than one glyph', () => {
            expect(() =>
                Icon.register({name: 'mixed', defs: [faFileInvoiceDollar, faTaco]})
            ).toThrow(/same icon/);
        });

        it('requires defs or an FA name', () => {
            expect(() => Icon.register({name: 'empty'})).toThrow(/'defs' or 'faName'/);
        });
    });

    describe('registerAll', () => {
        it('registers each config and returns their factories in order', () => {
            const [first, second] = Icon.registerAll([
                {name: 'invoiceA', faName: 'file-invoice-dollar'},
                {name: 'tacoB', faName: 'taco'}
            ]);

            expect(first().props.faName).toBe('file-invoice-dollar');
            expect(second().props.faName).toBe('taco');
        });
    });

    describe('get', () => {
        it('resolves built-in names, aliases, and FA names to the same glyph', () => {
            expect(Icon.get('plus').props.faName).toBe('plus');
            expect(Icon.get('add').props.faName).toBe('plus');
            expect(Icon.get('arrowsRotate').props.faName).toBe('arrows-rotate');
            expect(Icon.get('arrows-rotate').props.faName).toBe('arrows-rotate');
        });

        it('passes props through to the icon', () => {
            const icon = Icon.get('add', {prefix: 'fas', title: 'Add'});

            expect(icon.props.prefix).toBe('fas');
            expect(icon.props.title).toBe('Add');
        });

        it('returns null and warns for an unknown name', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

            expect(Icon.get('noSuchIcon')).toBeNull();
            expect(Icon.exists('noSuchIcon')).toBe(false);
            expect(warn).toHaveBeenCalledOnce();
        });

        it('renders an icon added to the FA library but not registered, warning once', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            library.add(faBurrito);

            expect(Icon.get('burrito').props.faName).toBe('burrito');
            expect(Icon.get('burrito', {prefix: 'fas'}).props.prefix).toBe('far');
            expect(Icon.exists('burrito')).toBe(false);
            expect(warn).toHaveBeenCalledOnce();
        });
    });

    describe('getCatalog', () => {
        it('lists each glyph once, with every name that resolves to it', () => {
            const catalog = Icon.getCatalog(),
                faNames = catalog.map(it => it.faName),
                rotate = catalog.find(it => it.faName === 'arrows-rotate');

            expect(new Set(faNames).size).toBe(faNames.length);
            expect(rotate.names).toEqual(
                expect.arrayContaining(['arrows-rotate', 'arrowsRotate', 'refresh', 'sync'])
            );
            expect(rotate.source).toBe('hoist');
        });

        it('includes registered glyphs, flagged as from the app', () => {
            Icon.register({
                name: 'dragonHoard',
                faName: 'dragon',
                displayName: 'Hoard',
                keywords: ['treasure']
            });

            const dragon = Icon.getCatalogEntry('dragon');
            expect(Icon.getCatalog()).toContain(dragon);
            expect(dragon.source).toBe('app');
            expect(dragon.names).toEqual(expect.arrayContaining(['dragon', 'dragonHoard']));
            expect(dragon.keywords).toContain('treasure');
        });

        it('lists an app name for a Hoist glyph as an alias of the Hoist entry', () => {
            Icon.register({name: 'preferences', faName: 'cog', displayName: 'Preferences'});

            const entry = Icon.getCatalogEntry('preferences');
            expect(entry).toBe(Icon.getCatalogEntry('gear'));
            expect(entry.source).toBe('hoist');
            expect(entry.name).toBe('gear');
            expect(entry.names).toContain('preferences');
            expect(Icon.getCatalog().filter(it => it.faName === 'cog')).toHaveLength(1);
        });

        it('keeps icons hidden from pickers in the catalog, flagged as hidden', () => {
            Icon.register({name: 'cactus', defs: faCactus, hideFromPicker: true});

            const entry = Icon.getCatalog().find(it => it.faName === 'cactus');
            expect(entry.hideFromPicker).toBe(true);
        });
    });

    describe('icon', () => {
        it('still renders an icon passed by the deprecated iconName', () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            expect(Icon.icon({iconName: 'plus'}).props.faName).toBe('plus');
        });
    });
});
