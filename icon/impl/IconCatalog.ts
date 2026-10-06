/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    findIconDefinition,
    IconDefinition,
    IconName,
    library
} from '@fortawesome/fontawesome-svg-core';
import {logWarn, throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {
    camelCase,
    castArray,
    forOwn,
    isEmpty,
    isFunction,
    pull,
    sortBy,
    startCase,
    union,
    uniq
} from 'lodash';
import type {
    HoistIconPrefix,
    Icon as IconSingleton,
    IconCatalogEntry,
    IconFactory,
    IconProps,
    IconRegistrationConfig
} from '../Icon';

/**
 * Objects owned by `Icon.ts` and handed to this catalog on module load - see `setSource()`.
 * @internal
 */
export interface IconCatalogSource {
    Icon: typeof IconSingleton & Record<string, any>;
    iconFactories: Record<string, IconFactory>;
    aliasFactories: Record<string, IconFactory>;
}

/** Prefixes checked when detecting the weights available for an icon, in preference order. */
const PREFIXES: HoistIconPrefix[] = ['far', 'fas', 'fal', 'fat', 'fab'];

/**
 * Catalog of all icons known to Hoist - its own built-in set plus any registered by an app via
 * `Icon.register()` - supporting name-based lookup and user-facing pickers.
 *
 * Hoist's built-ins are cataloged lazily on first use by calling the factories in `Icon.ts` and
 * reading the icon each one renders. That keeps this catalog automatically in sync as icons are
 * added to (or aliased within) that file, with no parallel list to maintain.
 *
 * @internal - apps should use the public API on the {@link Icon} singleton.
 */
class IconCatalog {
    private source: IconCatalogSource;
    private entries = new Map<IconName, IconCatalogEntry>();
    private entriesByName = new Map<string, IconCatalogEntry>();
    /** Factories installed on `Icon` by app registrations, keyed by registered name. */
    private registrations = new Map<
        string,
        {faName: IconName; factory: IconFactory; displayName: string}
    >();
    private builtInsLoaded = false;

    /** Called once by `Icon.ts` to provide the singleton and factory maps this catalog works on. */
    setSource(source: IconCatalogSource) {
        this.source = source;
    }

    /** Implementation for {@link Icon.register}. */
    register(config: IconRegistrationConfig): IconFactory {
        // Catalog built-ins first, so app registrations can always take precedence over them.
        this.ensureBuiltIns();

        const {Icon} = this.source,
            {name, defs, props, displayName, keywords, hideFromPicker, replace} = config;

        throwIf(!name, "Icon.register() | Must provide a 'name' for the icon.");
        throwIf(
            this.isReservedName(name),
            `Icon.register() | '${name}' is a method of Icon and cannot be used as an icon name.`
        );

        let {faName} = config;
        if (!isEmpty(defs)) {
            const defList = castArray(defs) as IconDefinition[],
                defNames = uniq(defList.map(it => it.iconName));

            throwIf(
                defNames.length > 1,
                `Icon.register() | '${name}' | All defs must be weight variants of the same icon - got ${defNames.join(', ')}.`
            );

            library.add(...defList);
            faName = faName ?? (defNames[0] as IconName);
        }
        throwIf(!faName, `Icon.register() | '${name}' | Must provide either 'defs' or 'faName'.`);

        const factory = this.makeFactory(faName, props, config.prefix),
            // A repeat of the same registration, e.g. when hot reload re-runs an app's icon module.
            isRepeat = this.registrations.get(name)?.faName === faName,
            install = replace || isRepeat || !isFunction(Icon[name]);

        if (!install) {
            logWarn(
                `Icon.register() | '${name}' is already defined on Icon, so the existing icon was kept. ` +
                    `The returned factory renders the new icon, but Icon.${name}() and Icon.get('${name}') do not. ` +
                    `Pass 'replace: true' to override the existing icon, or register under another name.`,
                'Icon'
            );
        }

        this.addAppIcon({
            faName,
            name: install ? name : null,
            prefix: config.prefix,
            displayName,
            keywords,
            hideFromPicker
        });

        if (install) {
            this.addName(name, faName);
            this.registrations.set(name, {
                faName,
                factory,
                displayName: displayName ?? startCase(name)
            });
            Icon[name] = factory;
        }
        return factory;
    }

    /** Factory for a factory or FA name - see {@link Icon.getFactory}. */
    getFactory(name: string): IconFactory {
        return this.registrations.get(name)?.factory ?? this.getEntry(name)?.factory ?? null;
    }

    /**
     * User-facing label for a factory or FA name. Several names can share one glyph, so a name
     * other than the glyph's primary one gets its own label - the registered `displayName`, else
     * one derived from the name.
     */
    getDisplayName(name: string): string {
        const entry = this.getEntry(name);
        if (!entry) return null;
        if (name === entry.name || name === entry.faName) return entry.displayName;
        return this.registrations.get(name)?.displayName ?? startCase(name);
    }

    /** Return the catalog entry for the given factory or FA name, or null if not registered. */
    getEntry(name: string): IconCatalogEntry {
        this.ensureBuiltIns();
        return this.entriesByName.get(name) ?? this.entries.get(name as IconName) ?? null;
    }

    /** All entries, sorted by display name - see {@link Icon.getCatalog}. */
    getEntries(): IconCatalogEntry[] {
        this.ensureBuiltIns();
        return sortBy([...this.entries.values()], 'displayName');
    }

    //------------------------
    // Implementation
    //------------------------
    /**
     * Catalog Hoist's built-in icons. Lazy, and run at most once - typically triggered by an app's
     * first registration, or by the first render of an IconPicker.
     */
    private ensureBuiltIns() {
        if (this.builtInsLoaded) return;
        this.builtInsLoaded = true;

        const {iconFactories, aliasFactories} = this.source;

        // Direct factories define the catalog - each contributes an entry for the icon it renders.
        forOwn(iconFactories, (factory, name) => {
            const faName = probeFaName(factory);
            if (!faName) return;

            // A handful of glyphs have more than one factory (e.g. `folder` and `tab`). Take the
            // one whose name matches the FA name as the entry's primary, else the first seen, so
            // pickers label the icon by its most literal name rather than an incidental synonym.
            const entry = this.getOrCreateEntry(faName);
            if (entry.name === faName || camelCase(faName) === name) {
                entry.name = name;
                entry.displayName = startCase(name);
            }
            this.addName(name, faName);
        });

        // Aliases contribute additional searchable names for the icons they delegate to.
        forOwn(aliasFactories, (factory, name) => {
            const faName = probeFaName(factory);
            if (!faName) return;
            this.getOrCreateEntry(faName);
            this.addName(name, faName);
        });
    }

    /** True for names of `Icon`'s own methods, which are not icon factories. */
    private isReservedName(name: string): boolean {
        const {Icon, iconFactories, aliasFactories} = this.source;
        return (
            isFunction(Icon[name]) &&
            !(name in iconFactories) &&
            !(name in aliasFactories) &&
            !this.registrations.has(name)
        );
    }

    /**
     * Create a factory bound to a specific icon, with optional baked-in props and default weight.
     * Applies the weight fallback described by `resolvePrefix()`.
     */
    private makeFactory(
        faName: IconName,
        props?: IconProps,
        defaultPrefix?: HoistIconPrefix
    ): IconFactory {
        return (p: IconProps = {}) =>
            this.source.Icon.icon({
                ...props,
                ...p,
                className: classNames(props?.className, p.className) || null,
                faName,
                prefix: this.resolvePrefix(faName, p.prefix ?? props?.prefix ?? defaultPrefix)
            });
    }

    /**
     * Return the entry for an FA glyph, creating it if new. Every entry's factory renders the plain
     * glyph - baked-in props belong only to the named factory of the registration that set them.
     */
    private getOrCreateEntry(faName: IconName): IconCatalogEntry {
        let entry = this.entries.get(faName);
        if (!entry) {
            const prefixes = this.detectPrefixes(faName);
            entry = {
                faName,
                name: faName,
                displayName: startCase(faName),
                prefix: preferredPrefix(prefixes),
                prefixes,
                names: [],
                keywords: [],
                source: 'hoist',
                hideFromPicker: false,
                factory: this.makeFactory(faName)
            };
            this.entries.set(faName, entry);
            this.addName(faName, faName);
        }
        return entry;
    }

    /**
     * Catalog a glyph registered by the app. A new glyph takes its name and options from the
     * registration. A glyph already in the catalog, such as one of Hoist's own, keeps its name,
     * label, default weight and visibility. It gains only the registered name as an alias, plus
     * any keywords. The registration's own `displayName` labels that alias - see `getDisplayName()`.
     */
    private addAppIcon(cfg: {
        faName: IconName;
        name: string;
        prefix: HoistIconPrefix;
        displayName: string;
        keywords: string[];
        hideFromPicker: boolean;
    }) {
        const {faName, name, prefix, displayName, keywords, hideFromPicker} = cfg,
            isNew = !this.entries.has(faName),
            entry = this.getOrCreateEntry(faName);

        // Re-detect weights, as the registration may have added some to the FA library.
        entry.prefixes = union(entry.prefixes, this.detectPrefixes(faName));

        if (isNew) {
            entry.source = 'app';
            if (name) entry.name = name;
            entry.displayName = displayName ?? startCase(name ?? faName);
            if (prefix) entry.prefix = prefix;
            entry.hideFromPicker = !!hideFromPicker;
        }
        if (!isEmpty(keywords)) entry.keywords = union(entry.keywords, keywords);
    }

    /** Map a factory/FA name to its entry, releasing it from any entry it previously pointed to. */
    private addName(name: string, faName: IconName) {
        const entry = this.entries.get(faName),
            prior = this.entriesByName.get(name);

        if (prior && prior !== entry) {
            pull(prior.names, name);
            // An entry losing its primary name falls back to its FA name.
            if (prior.name === name) {
                prior.name = prior.faName;
                if (prior.source === 'hoist') prior.displayName = startCase(prior.faName);
            }
        }

        this.entriesByName.set(name, entry);
        entry.names = union(entry.names, [name]);
    }

    /** Return the weights actually registered with FA for the given icon. */
    private detectPrefixes(faName: IconName): HoistIconPrefix[] {
        const ret = PREFIXES.filter(prefix => !!findIconDefinition({prefix, iconName: faName}));
        return isEmpty(ret) ? ['far'] : ret;
    }

    /**
     * Return the requested weight if available for this icon, otherwise the icon's default -
     * ensuring a request for an unimported variant renders the icon rather than nothing at all.
     */
    private resolvePrefix(faName: IconName, prefix: HoistIconPrefix): HoistIconPrefix {
        const entry = this.entries.get(faName);
        if (!entry) return prefix ?? 'far';
        return prefix && entry.prefixes.includes(prefix) ? prefix : entry.prefix;
    }
}

/**
 * Read the FA name rendered by an icon factory. Factories that require additional arguments, or
 * that do not render an FA icon at all, are skipped by returning null.
 */
function probeFaName(factory: IconFactory): IconName {
    try {
        return (factory({}) as any)?.props?.faName ?? null;
    } catch (e) {
        return null;
    }
}

function preferredPrefix(prefixes: HoistIconPrefix[]): HoistIconPrefix {
    return PREFIXES.find(it => prefixes?.includes(it)) ?? 'far';
}

/** @internal */
export const iconCatalog = new IconCatalog();
