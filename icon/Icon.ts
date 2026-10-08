/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {IconDefinition, IconName} from '@fortawesome/fontawesome-svg-core';
import {FontAwesomeIconProps} from '@fortawesome/react-fontawesome';
import {div} from '@xh/hoist/cmp/layout';
import {HoistProps, Intent, Thunkable} from '@xh/hoist/core';
import {apiDeprecated, logWarn, throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {last, split, toLower} from 'lodash';
import {ReactElement} from 'react';
import {iconCmp} from './impl/IconCmp';
import {enhanceFaClasses, iconHtml} from './impl/IconHtml';
import {iconCatalog} from './impl/IconCatalog';
import {SetRequired} from 'type-fest';
import './Icon.scss';

export interface IconProps extends HoistProps, Partial<Omit<FontAwesomeIconProps, 'ref'>> {
    /** Name of the icon in FontAwesome (e.g. `'cog'`). */
    faName?: IconName;

    /** @deprecated - use `faName` instead. Will be removed in v91. */
    iconName?: IconName;

    /** Weight / family style of the icon. */
    prefix?: HoistIconPrefix;

    intent?: Intent;

    /** Optional tooltip string. */
    title?: string;

    /** Size of the icon, as specified by the FontAwesome API. */
    size?:
        | '2xs'
        | 'xs'
        | 'sm'
        | 'lg'
        | 'xl'
        | '2xl'
        | '1x'
        | '2x'
        | '3x'
        | '4x'
        | '5x'
        | '6x'
        | '7x'
        | '8x'
        | '9x'
        | '10x';

    /**  Set to true to return the output as a string containing the raw <svg/> tag.*/
    asHtml?: boolean;

    /** True to skip rendering this Icon. */
    omit?: Thunkable<boolean>;
}

/**
 * Icon props after defaults applied by Hoist factory methods.
 * @internal
 */
export interface ResolvedIconProps extends IconProps {
    faName: IconName;
    prefix: HoistIconPrefix;
}

/** Supported FA prefixes, used to request a family-specific variant of an icon. */
export type HoistIconPrefix =
    | 'far' // regular
    | 'fas' // solid
    | 'fal' // light
    | 'fat' // thin
    | 'fab'; // brands (requires optional import, see Toolbox)

/** Factory function for a Hoist Icon - returns a rendered icon element for the given props. */
export type IconFactory = (p?: IconProps) => any;

/**
 * Config for registering a custom icon with Hoist via {@link Icon.register}.
 *
 * Provide either `defs` (FontAwesome icon definitions imported by the app) or `faName` (to
 * alias a glyph that has already been registered with the FA library, e.g. by Hoist itself).
 */
export interface IconRegistrationConfig {
    /**
     * Name for this icon - usable as a key for {@link Icon.get}. Use camelCase, matching Hoist's
     * built-in factories. The factory is also installed on {@link Icon} at runtime, but is not
     * typed there - call the factory returned by {@link Icon.register} instead.
     */
    name: string;

    /**
     * FontAwesome icon definition(s), as imported from the `@fortawesome/pro-*-svg-icons` packages.
     * Pass multiple weight variants of the *same* icon to make them all available - Hoist will add
     * them to the FA library and select the best available variant at render time.
     */
    defs?: IconDefinition | IconDefinition[];

    /**
     * FA name of an icon already registered with the FA library. Use as an alternative to `defs`
     * to alias an existing icon (e.g. one of Hoist's built-ins) under an app-specific name.
     */
    faName?: IconName;

    /**
     * Default weight/family for this icon. Defaults to the best available variant, preferring
     * regular, then solid, light, thin and brands.
     */
    prefix?: HoistIconPrefix;

    /**
     * Default props baked into the generated factory - can be overridden by callers. These apply
     * only to the factory for this registration, not to lookups of the icon by its FA name.
     */
    props?: IconProps;

    /** User-facing name, as shown by {@link IconPicker}. Defaults to a start-cased `name`. */
    displayName?: string;

    /** Additional search terms for this icon, used by {@link IconPicker}. */
    keywords?: string[];

    /**
     * True to leave this icon out of {@link IconPicker}'s default options. It stays usable in code
     * and by name, and a picker still offers it when listed in `icons`. Defaults to false.
     */
    hideFromPicker?: boolean;

    /**
     * True to replace an existing factory of the same name, including one of Hoist's built-in
     * icons. Without it, registering a name that already exists on {@link Icon} - one of Hoist's
     * own icons, or one the app registered earlier - keeps the existing icon and logs a console
     * warning. The factory returned by {@link Icon.register} still renders the new icon, but
     * `Icon[name]` and {@link Icon.get} keep resolving to the existing one.
     */
    replace?: boolean;
}

/**
 * An icon known to Hoist - i.e. registered with the FA library and available for rendering by
 * name. Returned by {@link Icon.getCatalog} and used to populate {@link IconPicker}.
 */
export interface IconCatalogEntry {
    /**
     * FA name of the underlying glyph (e.g. `cog`) - stable across FA versions and independent of
     * how Hoist or an app happens to name it.
     */
    faName: IconName;

    /**
     * Primary factory name on {@link Icon} for this icon (e.g. `gear`, `invoice`) - Hoist's own
     * name for a built-in, or the registered `name` for a custom icon. Falls back to `faName`
     * for an icon reachable only by its FA name.
     */
    name: string;

    /** User-facing name for this icon. */
    displayName: string;

    /** Default weight/family used when rendering this icon. */
    prefix: HoistIconPrefix;

    /** All weights/families registered with FA for this icon. */
    prefixes: HoistIconPrefix[];

    /**
     * Every name that resolves to this icon - its `faName`, its `name`, and any semantic aliases
     * (e.g. `arrows-rotate`, `arrowsRotate`, `sync`). All are accepted by {@link Icon.get}.
     */
    names: string[];

    /** Additional search terms for this icon. */
    keywords: string[];

    /**
     * Where the glyph comes from: `'hoist'` for Hoist's built-in set, or `'app'` for one the app
     * added via {@link Icon.register}. An app name registered for a Hoist glyph is an alias, so
     * that glyph stays `'hoist'`.
     */
    source: 'hoist' | 'app';

    /** True to leave out of {@link IconPicker}'s default options - see `hideFromPicker`. */
    hideFromPicker: boolean;

    /** Factory for rendering this icon. */
    factory: IconFactory;
}

/**
 * Direct factories for each icon in Hoist's built-in set. Exported for internal use by the
 * icon registry - apps should call these via the {@link Icon} singleton.
 * @internal
 */
export const iconFactories = {
    addressCard(p?: IconProps) {
        return Icon.icon({...p, faName: 'address-card'});
    },
    angleDoubleDown(p?: IconProps) {
        return Icon.icon({...p, faName: 'angle-double-down'});
    },
    angleDoubleLeft(p?: IconProps) {
        return Icon.icon({...p, faName: 'angle-double-left'});
    },
    angleDoubleRight(p?: IconProps) {
        return Icon.icon({...p, faName: 'angle-double-right'});
    },
    angleDoubleUp(p?: IconProps) {
        return Icon.icon({...p, faName: 'angle-double-up'});
    },
    angleDown(p?: IconProps) {
        return Icon.icon({...p, faName: 'angle-down'});
    },
    angleLeft(p?: IconProps) {
        return Icon.icon({...p, faName: 'angle-left'});
    },
    angleRight(p?: IconProps) {
        return Icon.icon({...p, faName: 'angle-right'});
    },
    angleUp(p?: IconProps) {
        return Icon.icon({...p, faName: 'angle-up'});
    },
    arrowDown(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-down'});
    },
    arrowDownToBracket(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-down-to-bracket'});
    },
    arrowDownToSquare(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-down-to-square'});
    },
    arrowLeft(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-left'});
    },
    arrowRight(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-right'});
    },
    arrowRightArrowLeft(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-right-arrow-left'});
    },
    arrowToBottom(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-to-bottom'});
    },
    arrowToLeft(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-to-left'});
    },
    arrowToRight(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-to-right'});
    },
    arrowToTop(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-to-top'});
    },
    arrowUp(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-up'});
    },
    arrowUpFromBracket(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrow-up-from-bracket'});
    },
    arrowsLeftRight(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrows-h'});
    },
    arrowsRotate(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrows-rotate'});
    },
    arrowsUpDown(p?: IconProps) {
        return Icon.icon({...p, faName: 'arrows-v'});
    },
    asterisk(p?: IconProps) {
        return Icon.icon({...p, faName: 'asterisk'});
    },
    balanceScale(p?: IconProps) {
        return Icon.icon({...p, faName: 'balance-scale'});
    },
    balanceScaleLeft(p?: IconProps) {
        return Icon.icon({...p, faName: 'balance-scale-left'});
    },
    balanceScaleRight(p?: IconProps) {
        return Icon.icon({...p, faName: 'balance-scale-right'});
    },
    bars(p?: IconProps) {
        return Icon.icon({...p, faName: 'bars'});
    },
    bolt(p?: IconProps) {
        return Icon.icon({...p, faName: 'bolt'});
    },
    book(p?: IconProps) {
        return Icon.icon({...p, faName: 'book'});
    },
    bookmark(p?: IconProps) {
        return Icon.icon({...p, faName: 'bookmark'});
    },
    books(p?: IconProps) {
        return Icon.icon({...p, faName: 'books'});
    },
    box(p?: IconProps) {
        return Icon.icon({...p, faName: 'box'});
    },
    boxFull(p?: IconProps) {
        return Icon.icon({...p, faName: 'box-full'});
    },
    browser(p?: IconProps) {
        return Icon.icon({...p, faName: 'browser'});
    },
    bullhorn(p?: IconProps) {
        return Icon.icon({...p, faName: 'bullhorn'});
    },
    calculator(p?: IconProps) {
        return Icon.icon({...p, faName: 'calculator'});
    },
    calendar(p?: IconProps) {
        return Icon.icon({...p, faName: 'calendar-day'});
    },
    calendarDays(p?: IconProps) {
        return Icon.icon({...p, faName: 'calendar-days'});
    },
    calendarRange(p?: IconProps) {
        return Icon.icon({...p, faName: 'calendar-range'});
    },
    camera(p?: IconProps) {
        return Icon.icon({...p, faName: 'camera'});
    },
    caretLeft(p?: IconProps) {
        return Icon.icon({...p, faName: 'caret-left'});
    },
    caretRight(p?: IconProps) {
        return Icon.icon({...p, faName: 'caret-right'});
    },
    chartArea(p?: IconProps) {
        return Icon.icon({...p, faName: 'chart-area'});
    },
    chartBar(p?: IconProps) {
        return Icon.icon({...p, faName: 'chart-column'});
    },
    chartLine(p?: IconProps) {
        return Icon.icon({...p, faName: 'chart-line'});
    },
    chartPie(p?: IconProps) {
        return Icon.icon({...p, faName: 'chart-pie'});
    },
    check(p?: IconProps) {
        return Icon.icon({...p, faName: 'check'});
    },
    checkCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'check-circle'});
    },
    checkSquare(p?: IconProps) {
        return Icon.icon({...p, faName: 'check-square'});
    },
    chess(p?: IconProps) {
        return Icon.icon({...p, faName: 'chess'});
    },
    chessKnight(p?: IconProps) {
        return Icon.icon({...p, faName: 'chess-knight-alt'});
    },
    chevronDown(p?: IconProps) {
        return Icon.icon({...p, faName: 'chevron-down'});
    },
    chevronLeft(p?: IconProps) {
        return Icon.icon({...p, faName: 'chevron-left'});
    },
    chevronRight(p?: IconProps) {
        return Icon.icon({...p, faName: 'chevron-right'});
    },
    chevronUp(p?: IconProps) {
        return Icon.icon({...p, faName: 'chevron-up'});
    },
    circle(p?: IconProps) {
        return Icon.icon({...p, faName: 'circle'});
    },
    circleNotch(p?: IconProps) {
        return Icon.icon({...p, faName: 'circle-notch'});
    },
    clipboard(p?: IconProps) {
        return Icon.icon({...p, faName: 'clipboard'});
    },
    clock(p?: IconProps) {
        return Icon.icon({...p, faName: 'clock'});
    },
    cloudDownload(p?: IconProps) {
        return Icon.icon({...p, faName: 'cloud-download'});
    },
    cloudUpload(p?: IconProps) {
        return Icon.icon({...p, faName: 'cloud-upload'});
    },
    code(p?: IconProps) {
        return Icon.icon({...p, faName: 'code'});
    },
    collapse(p?: IconProps) {
        return Icon.icon({...p, faName: 'compress-alt'});
    },
    comment(p?: IconProps) {
        return Icon.icon({
            ...p,
            faName: 'comment-dots',
            className: classNames(p?.className, 'fa-flip-horizontal')
        });
    },
    contact(p?: IconProps) {
        return Icon.icon({...p, faName: 'address-card'});
    },
    copy(p?: IconProps) {
        return Icon.icon({...p, faName: 'copy'});
    },
    cross(p?: IconProps) {
        return Icon.icon({...p, faName: 'times'});
    },
    crosshairs(p?: IconProps) {
        return Icon.icon({...p, faName: 'crosshairs'});
    },
    cube(p?: IconProps) {
        return Icon.icon({...p, faName: 'cube'});
    },
    database(p?: IconProps) {
        return Icon.icon({...p, faName: 'database'});
    },
    desktop(p?: IconProps) {
        return Icon.icon({...p, faName: 'desktop'});
    },
    dollarSign(p?: IconProps) {
        return Icon.icon({...p, faName: 'dollar-sign'});
    },
    dollarSignCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'usd-circle'});
    },
    ellipsisHorizontal(p?: IconProps) {
        return Icon.icon({...p, faName: 'ellipsis-h'});
    },
    ellipsisVertical(p?: IconProps) {
        return Icon.icon({...p, faName: 'ellipsis-v'});
    },
    envelope(p?: IconProps) {
        return Icon.icon({...p, faName: 'envelope'});
    },
    equals(p?: IconProps) {
        return Icon.icon({...p, faName: 'equals'});
    },
    euroSign(p?: IconProps) {
        return Icon.icon({...p, faName: 'euro-sign'});
    },
    expand(p?: IconProps) {
        return Icon.icon({...p, faName: 'expand-alt'});
    },
    experiment(p?: IconProps) {
        return Icon.icon({...p, faName: 'flask'});
    },
    eye(p?: IconProps) {
        return Icon.icon({...p, faName: 'eye'});
    },
    eyeSlash(p?: IconProps) {
        return Icon.icon({...p, faName: 'eye-slash'});
    },
    factory(p?: IconProps) {
        return Icon.icon({...p, faName: 'industry-alt'});
    },
    file(p?: IconProps) {
        return Icon.icon({...p, faName: 'file'});
    },
    fileArchive(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-archive'});
    },
    fileCertificate(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-certificate'});
    },
    fileChart(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-chart-column'});
    },
    fileCsv(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-csv'});
    },
    fileExcel(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-excel'});
    },
    fileImage(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-image'});
    },
    filePdf(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-pdf'});
    },
    filePowerpoint(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-powerpoint'});
    },
    fileText(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-alt'});
    },
    fileWord(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-word'});
    },
    fileXml(p?: IconProps) {
        return Icon.icon({...p, faName: 'file-xml'});
    },
    flag(p?: IconProps) {
        return Icon.icon({...p, faName: 'flag'});
    },
    floppyDisk(p?: IconProps) {
        return Icon.icon({...p, faName: 'floppy-disk'});
    },
    folder(p?: IconProps) {
        return Icon.icon({...p, faName: 'folder'});
    },
    folderOpen(p?: IconProps) {
        return Icon.icon({...p, faName: 'folder-open'});
    },
    func(p?: IconProps) {
        return Icon.icon({...p, faName: 'function'});
    },
    fund(p?: IconProps) {
        return Icon.icon({...p, faName: 'university'});
    },
    funnel(p?: IconProps) {
        return Icon.icon({...p, faName: 'filter'});
    },
    funnelSlash(p?: IconProps) {
        return Icon.icon({...p, faName: 'filter-slash'});
    },
    gauge(p?: IconProps) {
        return Icon.icon({...p, faName: 'gauge-high'});
    },
    gear(p?: IconProps) {
        return Icon.icon({...p, faName: 'cog'});
    },
    gears(p?: IconProps) {
        return Icon.icon({...p, faName: 'cogs'});
    },
    gift(p?: IconProps) {
        return Icon.icon({...p, faName: 'gift'});
    },
    globe(p?: IconProps) {
        return Icon.icon({...p, faName: 'globe'});
    },
    globeAmericas(p?: IconProps) {
        return Icon.icon({...p, faName: 'globe-americas'});
    },
    greaterThan(p?: IconProps) {
        return Icon.icon({...p, faName: 'greater-than'});
    },
    greaterThanEqual(p?: IconProps) {
        return Icon.icon({...p, faName: 'greater-than-equal'});
    },
    grid(p?: IconProps) {
        return Icon.icon({...p, faName: 'th'});
    },
    gridLarge(p?: IconProps) {
        return Icon.icon({...p, faName: 'th-large'});
    },
    gridPanel(p?: IconProps) {
        return Icon.icon({...p, faName: 'table'});
    },
    grip(p?: IconProps) {
        return Icon.icon({...p, faName: 'grip-horizontal'});
    },
    hand(p?: IconProps) {
        return Icon.icon({...p, faName: 'hand-paper'});
    },
    handshake(p?: IconProps) {
        return Icon.icon({...p, faName: 'handshake'});
    },
    health(p?: IconProps) {
        return Icon.icon({...p, faName: 'stethoscope'});
    },
    heartRate(p?: IconProps) {
        return Icon.icon({...p, faName: 'heart-rate'});
    },
    history(p?: IconProps) {
        return Icon.icon({...p, faName: 'history'});
    },
    home(p?: IconProps) {
        return Icon.icon({...p, faName: 'home'});
    },
    impersonate(p?: IconProps) {
        return Icon.icon({...p, faName: 'user-friends'});
    },
    inbox(p?: IconProps) {
        return Icon.icon({...p, faName: 'inbox'});
    },
    idBadge(p?: IconProps) {
        return Icon.icon({...p, faName: 'id-badge'});
    },
    infoCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'info-circle'});
    },
    institution(p?: IconProps) {
        return Icon.icon({...p, faName: 'university'});
    },
    json(p?: IconProps) {
        return Icon.icon({...p, faName: 'brackets-curly'});
    },
    layout(p?: IconProps) {
        return Icon.icon({...p, faName: 'table-layout'});
    },
    learn(p?: IconProps) {
        return Icon.icon({...p, faName: 'graduation-cap'});
    },
    lessThan(p?: IconProps) {
        return Icon.icon({...p, faName: 'less-than'});
    },
    lessThanEqual(p?: IconProps) {
        return Icon.icon({...p, faName: 'less-than-equal'});
    },
    link(p?: IconProps) {
        return Icon.icon({...p, faName: 'link'});
    },
    list(p?: IconProps) {
        return Icon.icon({...p, faName: 'align-justify'});
    },
    location(p?: IconProps) {
        return Icon.icon({...p, faName: 'map-marker-alt'});
    },
    lock(p?: IconProps) {
        return Icon.icon({...p, faName: 'lock'});
    },
    login(p?: IconProps) {
        return Icon.icon({...p, faName: 'sign-in'});
    },
    logout(p?: IconProps) {
        return Icon.icon({...p, faName: 'sign-out'});
    },
    magic(p?: IconProps) {
        return Icon.icon({...p, faName: 'wand-magic-sparkles'});
    },
    magnifyingGlass(p?: IconProps) {
        return Icon.icon({...p, faName: 'magnifying-glass'});
    },
    mail(p?: IconProps) {
        return Icon.icon({...p, faName: 'envelope'});
    },
    mapSigns(p?: IconProps) {
        return Icon.icon({...p, faName: 'map-signs'});
    },
    mask(p?: IconProps) {
        return Icon.icon({...p, faName: 'mask'});
    },
    memory(p?: IconProps) {
        return Icon.icon({...p, faName: 'memory'});
    },
    minusCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'minus-circle'});
    },
    mixedChart(p?: IconProps) {
        return Icon.icon({...p, faName: 'analytics'});
    },
    mobile(p?: IconProps) {
        return Icon.icon({...p, faName: 'mobile-screen'});
    },
    moon(p?: IconProps) {
        return Icon.icon({...p, faName: 'moon'});
    },
    news(p?: IconProps) {
        return Icon.icon({...p, faName: 'newspaper'});
    },
    notEquals(p?: IconProps) {
        return Icon.icon({...p, faName: 'not-equal'});
    },
    office(p?: IconProps) {
        return Icon.icon({...p, faName: 'building'});
    },
    openExternal(p?: IconProps) {
        return Icon.icon({...p, faName: 'external-link'});
    },
    options(p?: IconProps) {
        return Icon.icon({...p, faName: 'sliders-h-square'});
    },
    paperclip(p?: IconProps) {
        return Icon.icon({...p, faName: 'paperclip'});
    },
    paste(p?: IconProps) {
        return Icon.icon({...p, faName: 'paste'});
    },
    pause(p?: IconProps) {
        return Icon.icon({...p, faName: 'pause'});
    },
    pauseCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'pause-circle'});
    },
    penToSquare(p?: IconProps) {
        return Icon.icon({...p, faName: 'pen-to-square'});
    },
    phone(p?: IconProps) {
        return Icon.icon({...p, faName: 'phone-alt'});
    },
    pin(p?: IconProps) {
        return Icon.icon({...p, faName: 'thumbtack'});
    },
    play(p?: IconProps) {
        return Icon.icon({...p, faName: 'play'});
    },
    playCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'play-circle'});
    },
    plus(p?: IconProps) {
        return Icon.icon({...p, faName: 'plus'});
    },
    plusCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'plus-circle'});
    },
    pointerUp(p?: IconProps) {
        return Icon.icon({...p, faName: 'hand-point-up'});
    },
    portfolio(p?: IconProps) {
        return Icon.icon({...p, faName: 'briefcase'});
    },
    poundSign(p?: IconProps) {
        return Icon.icon({...p, faName: 'pound-sign'});
    },
    print(p?: IconProps) {
        return Icon.icon({...p, faName: 'print'});
    },
    question(p?: IconProps) {
        return Icon.icon({...p, faName: 'question'});
    },
    questionCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'question-circle'});
    },
    random(p?: IconProps) {
        return Icon.icon({...p, faName: 'random'});
    },
    receipt(p?: IconProps) {
        return Icon.icon({...p, faName: 'receipt'});
    },
    redo(p?: IconProps) {
        return Icon.icon({...p, faName: 'redo'});
    },
    reset(p?: IconProps) {
        return Icon.icon({...p, faName: 'undo'});
    },
    rocket(p?: IconProps) {
        return Icon.icon({...p, faName: 'rocket'});
    },
    roles(p?: IconProps) {
        return Icon.icon({...p, faName: 'user-shield'});
    },
    server(p?: IconProps) {
        return Icon.icon({...p, faName: 'server'});
    },
    settings(p?: IconProps) {
        return Icon.icon({...p, faName: 'sliders-h-square'});
    },
    shield(p?: IconProps) {
        return Icon.icon({...p, faName: 'shield-alt'});
    },
    shieldCheck(p?: IconProps) {
        return Icon.icon({...p, faName: 'shield-check'});
    },
    shieldHalved(p?: IconProps) {
        return Icon.icon({...p, faName: 'shield-halved'});
    },
    sigma(p?: IconProps) {
        return Icon.icon({...p, faName: 'sigma'});
    },
    skull(p?: IconProps) {
        return Icon.icon({...p, faName: 'skull'});
    },
    slashedCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'ban'});
    },
    sparkles(p?: IconProps) {
        return Icon.icon({...p, faName: 'sparkles'});
    },
    spinner(p?: IconProps) {
        return Icon.icon({...p, faName: 'spinner'});
    },
    spinnerScale(p?: IconProps) {
        return Icon.icon({...p, faName: 'spinner-scale'});
    },
    spinnerThird(p?: IconProps) {
        return Icon.icon({...p, faName: 'spinner-third'});
    },
    square(p?: IconProps) {
        return Icon.icon({...p, faName: 'square'});
    },
    squareMinus(p?: IconProps) {
        return Icon.icon({...p, faName: 'square-minus'});
    },
    star(p?: IconProps) {
        return Icon.icon({...p, faName: 'star'});
    },
    stop(p?: IconProps) {
        return Icon.icon({...p, faName: 'stop'});
    },
    stopCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'stop-circle'});
    },
    stopwatch(p?: IconProps) {
        return Icon.icon({...p, faName: 'stopwatch'});
    },
    sun(p?: IconProps) {
        return Icon.icon({...p, faName: 'sun'});
    },
    tab(p?: IconProps) {
        return Icon.icon({...p, faName: 'folder'});
    },
    table(p?: IconProps) {
        return Icon.icon({...p, faName: 'table'});
    },
    tag(p?: IconProps) {
        return Icon.icon({...p, faName: 'tag'});
    },
    tags(p?: IconProps) {
        return Icon.icon({...p, faName: 'tags'});
    },
    target(p?: IconProps) {
        return Icon.icon({...p, faName: 'bullseye-arrow'});
    },
    terminal(p?: IconProps) {
        return Icon.icon({...p, faName: 'rectangle-terminal'});
    },
    thumbsDown(p?: IconProps) {
        return Icon.icon({...p, faName: 'thumbs-down'});
    },
    thumbsUp(p?: IconProps) {
        return Icon.icon({...p, faName: 'thumbs-up'});
    },
    toast(p?: IconProps) {
        return Icon.icon({...p, faName: 'bread-slice'});
    },
    toolbox(p?: IconProps) {
        return Icon.icon({...p, faName: 'toolbox'});
    },
    tools(p?: IconProps) {
        return Icon.icon({...p, faName: 'tools'});
    },
    trash(p?: IconProps) {
        return Icon.icon({...p, faName: 'trash-alt'});
    },
    treeGraph(p?: IconProps) {
        return Icon.icon({...p, faName: 'sitemap'});
    },
    treeList(p?: IconProps) {
        return Icon.icon({...p, faName: 'list-tree'});
    },
    treeMap(p?: IconProps) {
        return Icon.icon({...p, faName: 'chart-tree-map'});
    },
    undo(p?: IconProps) {
        return Icon.icon({...p, faName: 'undo'});
    },
    unlink(p?: IconProps) {
        return Icon.icon({...p, faName: 'unlink'});
    },
    unlock(p?: IconProps) {
        return Icon.icon({...p, faName: 'lock-open'});
    },
    user(p?: IconProps) {
        return Icon.icon({...p, faName: 'user'});
    },
    userCheck(p?: IconProps) {
        return Icon.icon({...p, faName: 'user-check'});
    },
    userCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'user-circle'});
    },
    userClock(p?: IconProps) {
        return Icon.icon({...p, faName: 'user-clock'});
    },
    users(p?: IconProps) {
        return Icon.icon({...p, faName: 'users'});
    },
    warning(p?: IconProps) {
        return Icon.icon({...p, faName: 'exclamation-triangle'});
    },
    warningCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'exclamation-circle'});
    },
    warningSquare(p?: IconProps) {
        return Icon.icon({...p, faName: 'exclamation-square'});
    },
    window(p?: IconProps) {
        return Icon.icon({...p, faName: 'window'});
    },
    wrench(p?: IconProps) {
        return Icon.icon({...p, faName: 'wrench'});
    },
    x(p?: IconProps) {
        return Icon.icon({...p, faName: 'times'});
    },
    xCircle(p?: IconProps) {
        return Icon.icon({...p, faName: 'times-circle'});
    },
    xHexagon(p?: IconProps) {
        return Icon.icon({...p, faName: 'times-hexagon'});
    }
};

/**
 * Semantic aliases mapping common Hoist concepts to specific icons in the set above.
 * Apps can override any of these (or any direct factory) via {@link Icon.register} with
 * `replace: true`. Exported for internal use by the icon registry.
 * @internal
 */
export const aliasFactories = {
    accessDenied(p?: IconProps) {
        return Icon.slashedCircle(p);
    },
    add(p?: IconProps) {
        return Icon.plus(p);
    },
    ai(p?: IconProps) {
        return Icon.sparkles(p);
    },
    analytics(p?: IconProps) {
        return Icon.mixedChart(p);
    },
    approve(p?: IconProps) {
        return Icon.userCheck(p);
    },
    attachment(p?: IconProps) {
        return Icon.paperclip(p);
    },
    close(p?: IconProps) {
        return Icon.x(p);
    },
    columnMenu(p?: IconProps) {
        return Icon.bars(p);
    },
    danger(p?: IconProps) {
        return Icon.xCircle(p);
    },
    delete(p?: IconProps) {
        return Icon.minusCircle(p);
    },
    detail(p?: IconProps) {
        return Icon.magnifyingGlass(p);
    },
    diff(p?: IconProps) {
        return Icon.arrowRightArrowLeft(p);
    },
    disabled(p?: IconProps) {
        return Icon.slashedCircle(p);
    },
    download(p?: IconProps) {
        return Icon.arrowDownToBracket(p);
    },
    edit(p?: IconProps) {
        return Icon.penToSquare(p);
    },
    error(p?: IconProps) {
        return Icon.xHexagon(p);
    },
    favorite(p?: IconProps) {
        return Icon.star(p);
    },
    filter(p?: IconProps) {
        return Icon.funnel(p);
    },
    filterSlash(p?: IconProps) {
        return Icon.funnelSlash(p);
    },
    groupRowCollapsed(p?: IconProps) {
        return Icon.angleRight(p);
    },
    groupRowExpanded(p?: IconProps) {
        return Icon.angleDown(p);
    },
    info(p?: IconProps) {
        return Icon.infoCircle(p);
    },
    instrument(p?: IconProps) {
        return Icon.fileCertificate(p);
    },
    menu(p?: IconProps) {
        return Icon.bars(p);
    },
    panelCollapseToggleDown(p?: IconProps) {
        return Icon.chevronDown(p);
    },
    panelCollapseToggleLeft(p?: IconProps) {
        return Icon.chevronLeft(p);
    },
    panelCollapseToggleRight(p?: IconProps) {
        return Icon.chevronRight(p);
    },
    panelCollapseToggleUp(p?: IconProps) {
        return Icon.chevronUp(p);
    },
    refresh(p?: IconProps) {
        return Icon.arrowsRotate(p);
    },
    report(p?: IconProps) {
        return Icon.fileChart(p);
    },
    save(p?: IconProps) {
        return Icon.floppyDisk(p);
    },
    search(p?: IconProps) {
        return Icon.magnifyingGlass(p);
    },
    selectDropdown(p?: IconProps) {
        return Icon.chevronDown(p);
    },
    sortAbsAsc(p?: IconProps) {
        return Icon.arrowToTop(p);
    },
    sortAbsDesc(p?: IconProps) {
        return Icon.arrowToBottom(p);
    },
    sortAsc(p?: IconProps) {
        return Icon.arrowUp(p);
    },
    sortDesc(p?: IconProps) {
        return Icon.arrowDown(p);
    },
    success(p?: IconProps) {
        return Icon.checkCircle(p);
    },
    sync(p?: IconProps) {
        return Icon.arrowsRotate(p);
    },
    transaction(p?: IconProps) {
        return Icon.arrowRightArrowLeft(p);
    },
    upload(p?: IconProps) {
        return Icon.arrowUpFromBracket(p);
    }
};

/**
 * Singleton class to provide factories for creating standard FontAwesome-based icons.
 *
 * Hoist imports the licensed "pro" library with additional icons - note this requires fetching the
 * FA npm package via a registry URL w/license token.
 *
 * See https://fontawesome.com/pro#license.
 */
export const Icon = {
    ...iconFactories,
    ...aliasFactories,

    /**
     * Return a Hoist element wrapper around a FontAwesome-based icon.
     *
     * Note that for an app to use an icon with this factory, its definition must have been already
     * imported and registered with FontAwesome. Apps will find many/most of the icons they need
     * pre-registered and enumerated by the Hoist factories below. Favor those ready-made factories
     * wherever possible for consistency across and within apps.
     *
     * If the FA icon of your dreams is not available, register it once in your app's bootstrap
     * code via {@link Icon.register} - that will import it into the FA library, return a typed
     * factory for it, and make it available to {@link IconPicker}.
     */
    icon(opts: SetRequired<IconProps, 'faName'> | SetRequired<IconProps, 'iconName'>): any {
        let {
            faName,
            iconName,
            prefix = 'far',
            className,
            intent,
            title,
            size,
            asHtml = false,
            ...rest
        } = opts ?? {};
        if (iconName && !faName) {
            apiDeprecated('IconProps.iconName', {
                v: 'v91',
                msg: "Use 'faName' instead - or register the icon via Icon.register() and use the factory it returns.",
                source: 'Icon'
            });
            faName = iconName;
        }
        if (intent) {
            className = classNames(className, `xh-intent-${intent}`);
        }
        return asHtml
            ? iconHtml({faName, prefix, className, title, size})
            : iconCmp({faName, prefix, className, title, size, ...rest});
    },

    /**
     * Register a custom icon with Hoist, for apps that need glyphs beyond Hoist's built-in set.
     *
     * Pass one or more FontAwesome definitions imported by the app and Hoist will add them to the
     * FA library, install a factory for them on this `Icon` singleton, and include them in the
     * catalog offered by {@link IconPicker}. Returns the generated factory, so apps can export it
     * directly for typed, IDE-discoverable use:
     *
     * ```typescript
     *   // src/core/Icons.ts
     *   import {faFileInvoiceDollar} from '@fortawesome/pro-regular-svg-icons';
     *   import {faFileInvoiceDollar as faFileInvoiceDollarSolid} from '@fortawesome/pro-solid-svg-icons';
     *
     *   export const invoiceIcon = Icon.register({
     *       name: 'invoice',
     *       defs: [faFileInvoiceDollar, faFileInvoiceDollarSolid]
     *   });
     *
     *   invoiceIcon();                    // regular variant
     *   invoiceIcon({prefix: 'fas'});     // solid variant
     *   Icon.get('invoice');              // same, resolved dynamically by name
     * ```
     *
     * Note that Hoist will select the best *available* weight for a registered icon, so apps only
     * need to import the variants they actually intend to use - a request for an unregistered
     * weight will render the icon's default variant instead of failing silently.
     *
     * Pass `replace: true` to replace an existing factory, including Hoist's own - the supported
     * way for apps to swap Hoist's choices for their own. If `name` already exists on `Icon`
     * without `replace: true`, Hoist keeps the existing icon and logs a console warning, so a name
     * conflict never stops an app from starting. Registering the same name and glyph again, such as
     * when hot reload re-runs an app's icon module, updates the registration without a warning.
     */
    register(config: IconRegistrationConfig): IconFactory {
        return iconCatalog.register(config);
    },

    /** Register multiple custom icons - see {@link Icon.register}. */
    registerAll(configs: IconRegistrationConfig[]): IconFactory[] {
        return configs.map(it => iconCatalog.register(it));
    },

    /**
     * Render a registered icon by name, for use with dynamic values - e.g. an icon choice
     * persisted by a user via {@link IconPicker}.
     *
     * Accepts either a factory name (`'add'`, `'invoice'`) or an FA name (`'plus'`). An icon added
     * to the FA library but not registered still renders, with a one-time warning. Returns null
     * and logs a warning if the requested icon is not found.
     */
    get(name: string, props?: IconProps): any {
        const factory = Icon.getFactory(name);
        if (!factory) {
            logWarn(
                `Icon '${name}' not found - has it been registered via Icon.register()?`,
                'Icon'
            );
            return null;
        }
        return factory(props);
    },

    /** Return the factory for a registered icon, or null if not found - see {@link Icon.get}. */
    getFactory(name: string): IconFactory {
        return iconCatalog.getFactory(name);
    },

    /**
     * Return metadata for a single registered icon, or null if not found. Accepts either a factory
     * name or an FA name - see {@link Icon.get}.
     */
    getCatalogEntry(name: string): IconCatalogEntry {
        return iconCatalog.getEntry(name);
    },

    /** True if an icon with the given factory or FA name has been registered. */
    exists(name: string): boolean {
        return !!iconCatalog.getEntry(name);
    },

    /**
     * User-facing label for a factory or FA name, or null if not found. A name that shares its
     * glyph with others, such as an app alias for a Hoist icon, gets its own label.
     */
    getDisplayName(name: string): string {
        return iconCatalog.getDisplayName(name);
    },

    /**
     * Return metadata for all icons known to Hoist - its built-in set plus any registered by the
     * app via {@link Icon.register} - sorted by display name.
     *
     * Used to populate {@link IconPicker}. Note that entries flagged `hideFromPicker` are included
     * here but excluded from pickers by default.
     */
    getCatalog(): IconCatalogEntry[] {
        return iconCatalog.getEntries();
    },

    /**
     * Create an Icon for a file with default styling appropriate for the file type.
     *
     * @param opts - Props to pass to Icon.icon(), along with an optional filename to be used to
     *   create icon.  Name will be parsed for an extension.  If not provided or recognized, a
     *   default icon will be returned.
     */
    fileIcon(opts: IconProps & {filename: string}): any {
        const {filename, ...rest} = opts,
            {factory, className} = getFileIconConfig(filename);

        return factory({...rest, className: classNames(className, rest.className)});
    },

    /**
     * Returns an empty div sized to occupy the width of a standard icon. Can be used to take up
     * room in a layout where an icon might otherwise go - e.g. to align a series of menu items,
     * where some items do not have an icon but others do.
     */
    placeholder(opts?: IconProps): any {
        const {size, asHtml = false} = opts ?? {},
            className = enhanceFaClasses('xh-icon--placeholder', size);
        return asHtml ? `<div class="${className}"></div>` : div({className});
    }
};

// Provide the registry with the singleton and factory maps it needs to catalog Hoist's built-in
// icons and install app-registered additions. Done here (rather than via an import within the
// registry) to avoid a circular dependency between the two modules.
iconCatalog.setSource({Icon, iconFactories, aliasFactories});

/**
 * Translate an icon into an HTML `<svg>` tag.
 *
 * Not typically used by applications. Applications that need HTML for an icon should use the
 * {@link IconProps.asHtml} flag on the Icon factory functions instead.
 *
 * @param iconElem - React element representing a Hoist Icon component.
 *      Must be created by Hoist's built-in Icon factories.
 * @returns HTML string for the icon's `<svg>` tag.
 * @internal
 */
export function convertIconToHtml(iconElem: ReactElement): string {
    throwIf(
        !(iconElem?.type as any)?.isHoistComponent,
        'Icon not provided, or not created by a Hoist Icon factory - cannot convert to HTML/SVG.'
    );
    return iconHtml(iconElem.props as ResolvedIconProps);
}

//-----------------------------
// Implementation
//-----------------------------
function getFileIconConfig(filename: string) {
    const extension = filename ? last(split(filename, '.')) : '';
    switch (toLower(extension)) {
        case 'png':
        case 'gif':
        case 'jpg':
        case 'jpeg':
            return {factory: Icon.fileImage};
        case 'doc':
        case 'docx':
            return {factory: Icon.fileWord, className: 'xh-file-icon-word'};
        case 'csv':
            return {factory: Icon.fileCsv, className: 'xh-file-icon-excel'};
        case 'xls':
        case 'xlsx':
            return {factory: Icon.fileExcel, className: 'xh-file-icon-excel'};
        case 'ppt':
        case 'pptx':
            return {factory: Icon.filePowerpoint, className: 'xh-file-icon-powerpoint'};
        case 'msg':
        case 'eml':
            return {factory: Icon.mail, className: 'xh-file-icon-mail'};
        case 'pdf':
            return {factory: Icon.filePdf, className: 'xh-file-icon-pdf'};
        case 'txt':
            return {factory: Icon.fileText};
        case 'xml':
            return {factory: Icon.fileXml};
        case 'zip':
            return {factory: Icon.fileArchive};
        default:
            return {factory: Icon.file};
    }
}
