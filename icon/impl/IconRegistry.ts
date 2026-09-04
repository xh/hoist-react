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
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {castArray, forOwn, isEmpty, isFunction, pull, sortBy, startCase, union, uniq} from 'lodash';
import type {
    HoistIconPrefix,
    Icon as IconSingleton,
    IconCatalogEntry,
    IconFactory,
    IconProps,
    IconRegistrationConfig
} from '../Icon';

/**
 * Objects owned by `Icon.ts` and handed to this registry on module load - see `setSource()`.
 * @internal
 */
export interface IconRegistrySource {
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
 * reading the icon each one renders. That keeps this registry automatically in sync as icons are
 * added to (or aliased within) that file, with no parallel list to maintain.
 *
 * @internal - apps should use the public API on the {@link Icon} singleton.
 */
class IconRegistry {
    private source: IconRegistrySource;
    private entries = new Map<IconName, IconCatalogEntry>();
    private entriesByName = new Map<string, IconCatalogEntry>();
    private builtInsLoaded = false;

    /** Called once by `Icon.ts` to provide the singleton and factory maps this registry works on. */
    setSource(source: IconRegistrySource) {
        this.source = source;
    }

    /** Implementation for {@link Icon.register}. */
    register(config: IconRegistrationConfig): IconFactory {
        // Catalog built-ins first, so app registrations can always take precedence over them.
        this.ensureBuiltIns();

        const {Icon} = this.source,
            {name, defs, props, displayName, keywords, hidden, replace} = config;

        throwIf(!name, "Icon.register() | Must provide a 'name' for the icon.");
        throwIf(
            isFunction(Icon[name]) && !replace,
            `Icon.register() | '${name}' is already defined on Icon - pass 'replace: true' to intentionally override it.`
        );

        let {iconName} = config;
        if (!isEmpty(defs)) {
            const defList = castArray(defs) as IconDefinition[],
                defNames = uniq(defList.map(it => it.iconName));

            throwIf(
                defNames.length > 1,
                `Icon.register() | '${name}' | All defs must be weight variants of the same icon - got ${defNames.join(', ')}.`
            );

            library.add(...defList);
            iconName = iconName ?? (defNames[0] as IconName);
        }
        throwIf(
            !iconName,
            `Icon.register() | '${name}' | Must provide either 'defs' or 'iconName'.`
        );

        const factory = this.makeFactory(iconName, props);
        this.upsertEntry({
            iconName,
            prefix: config.prefix,
            prefixes: this.detectPrefixes(iconName),
            displayName: displayName ?? startCase(name),
            keywords,
            hidden,
            isCustom: true,
            factory
        });
        this.addName(name, iconName);

        Icon[name] = factory;
        return factory;
    }

    /** Return the catalog entry for the given factory or FA name, or null if not registered. */
    getEntry(name: string): IconCatalogEntry {
        this.ensureBuiltIns();
        return this.entriesByName.get(name) ?? this.entries.get(name as IconName) ?? null;
    }

    /** Implementation for {@link Icon.getCatalog}. */
    getCatalog(): IconCatalogEntry[] {
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
            const iconName = probeIconName(factory);
            if (!iconName) return;
            this.upsertEntry({
                iconName,
                prefixes: this.detectPrefixes(iconName),
                displayName: startCase(name)
            });
            this.addName(name, iconName);
        });

        // Aliases contribute additional searchable names for the icons they delegate to.
        forOwn(aliasFactories, (factory, name) => {
            const iconName = probeIconName(factory);
            if (!iconName) return;
            this.upsertEntry({iconName, prefixes: this.detectPrefixes(iconName)});
            this.addName(name, iconName);
        });
    }

    /**
     * Create a factory bound to a specific icon, with optional baked-in props. Applies the weight
     * fallback described by `resolvePrefix()`.
     */
    private makeFactory(iconName: IconName, props?: IconProps): IconFactory {
        return (p: IconProps = {}) =>
            this.source.Icon.icon({
                ...props,
                ...p,
                className: classNames(props?.className, p.className) || null,
                iconName,
                prefix: this.resolvePrefix(iconName, p.prefix ?? props?.prefix)
            });
    }

    private upsertEntry(cfg: Partial<IconCatalogEntry>): IconCatalogEntry {
        const {iconName} = cfg;
        let entry = this.entries.get(iconName);

        if (!entry) {
            entry = {
                iconName,
                displayName: cfg.displayName ?? startCase(iconName),
                prefix: cfg.prefix ?? preferredPrefix(cfg.prefixes),
                prefixes: cfg.prefixes ?? ['far'],
                names: [],
                keywords: [],
                isCustom: !!cfg.isCustom,
                hidden: !!cfg.hidden,
                factory: cfg.factory ?? this.makeFactory(iconName)
            };
            this.entries.set(iconName, entry);
            this.addName(iconName, iconName);
        } else {
            if (cfg.displayName) entry.displayName = cfg.displayName;
            if (cfg.prefix) entry.prefix = cfg.prefix;
            if (cfg.prefixes) entry.prefixes = union(entry.prefixes, cfg.prefixes);
            if (cfg.hidden != null) entry.hidden = cfg.hidden;
            if (cfg.isCustom) {
                // App registrations take ownership of how this icon renders by default.
                entry.isCustom = true;
                entry.factory = cfg.factory;
            }
        }

        if (!isEmpty(cfg.keywords)) entry.keywords = union(entry.keywords, cfg.keywords);
        return entry;
    }

    /** Map a factory/FA name to its entry, releasing it from any entry it previously pointed to. */
    private addName(name: string, iconName: IconName) {
        const entry = this.entries.get(iconName),
            prior = this.entriesByName.get(name);

        if (prior && prior !== entry) pull(prior.names, name);

        this.entriesByName.set(name, entry);
        entry.names = union(entry.names, [name]);
    }

    /** Return the weights actually registered with FA for the given icon. */
    private detectPrefixes(iconName: IconName): HoistIconPrefix[] {
        const ret = PREFIXES.filter(prefix => !!findIconDefinition({prefix, iconName}));
        return isEmpty(ret) ? ['far'] : ret;
    }

    /**
     * Return the requested weight if available for this icon, otherwise the icon's default -
     * ensuring a request for an unimported variant renders the icon rather than nothing at all.
     */
    private resolvePrefix(iconName: IconName, prefix: HoistIconPrefix): HoistIconPrefix {
        const entry = this.entries.get(iconName);
        if (!entry) return prefix ?? 'far';
        return prefix && entry.prefixes.includes(prefix) ? prefix : entry.prefix;
    }
}

/**
 * Read the FA name rendered by an icon factory. Factories that require additional arguments, or
 * that do not render an FA icon at all, are skipped by returning null.
 */
function probeIconName(factory: IconFactory): IconName {
    try {
        return (factory({}) as any)?.props?.iconName ?? null;
    } catch (e) {
        return null;
    }
}

function preferredPrefix(prefixes: HoistIconPrefix[]): HoistIconPrefix {
    return PREFIXES.find(it => prefixes?.includes(it)) ?? 'far';
}

/** @internal */
export const iconRegistry = new IconRegistry();
