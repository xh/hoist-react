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
import {logWarn, throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {last, split, toLower} from 'lodash';
import {ReactElement} from 'react';
import {iconCmp} from './impl/IconCmp';
import {enhanceFaClasses, iconHtml} from './impl/IconHtml';
import {iconRegistry} from './impl/IconRegistry';
import {SetRequired} from 'type-fest';
import './Icon.scss';

export interface IconProps extends HoistProps, Partial<Omit<FontAwesomeIconProps, 'ref'>> {
    /** Name of the icon in FontAwesome. */
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
    iconName: IconName;
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
 * Provide either `defs` (FontAwesome icon definitions imported by the app) or `iconName` (to
 * alias a glyph that has already been registered with the FA library, e.g. by Hoist itself).
 */
export interface IconRegistrationConfig {
    /**
     * Name for this icon - installed as a factory method on {@link Icon} (e.g. `Icon.invoice()`)
     * and usable as a key for {@link Icon.get}. Use camelCase, matching Hoist's built-in factories.
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
    iconName?: IconName;

    /**
     * Default weight/family for this icon. Defaults to the best available variant, preferring
     * regular, then solid, light, thin and brands.
     */
    prefix?: HoistIconPrefix;

    /** Default props baked into the generated factory - can be overridden by callers. */
    props?: IconProps;

    /** User-facing name, as shown by {@link IconPicker}. Defaults to a start-cased `name`. */
    displayName?: string;

    /** Additional search terms for this icon, used by {@link IconPicker}. */
    keywords?: string[];

    /** True to exclude this icon from user-facing pickers. Defaults to false. */
    hidden?: boolean;

    /**
     * True to replace an existing factory of the same name - required when intentionally
     * overriding one of Hoist's built-in icons, to guard against accidental clobbering.
     */
    replace?: boolean;
}

/**
 * An icon known to Hoist - i.e. registered with the FA library and available for rendering by
 * name. Returned by {@link Icon.getCatalog} and used to populate {@link IconPicker}.
 */
export interface IconCatalogEntry {
    /** FA name of the underlying glyph - the canonical, persistable identifier for this icon. */
    iconName: IconName;

    /** User-facing name for this icon. */
    displayName: string;

    /** Default weight/family used when rendering this icon. */
    prefix: HoistIconPrefix;

    /** All weights/families registered with FA for this icon. */
    prefixes: HoistIconPrefix[];

    /** All factory names on {@link Icon} that resolve to this icon (e.g. `plus` and `add`). */
    names: string[];

    /** Additional search terms for this icon. */
    keywords: string[];

    /** True if registered by the application via {@link Icon.register}. */
    isCustom: boolean;

    /** True to exclude from user-facing pickers. */
    hidden: boolean;

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
        return Icon.icon({...p, iconName: 'address-card'});
    },
    angleDoubleDown(p?: IconProps) {
        return Icon.icon({...p, iconName: 'angle-double-down'});
    },
    angleDoubleLeft(p?: IconProps) {
        return Icon.icon({...p, iconName: 'angle-double-left'});
    },
    angleDoubleRight(p?: IconProps) {
        return Icon.icon({...p, iconName: 'angle-double-right'});
    },
    angleDoubleUp(p?: IconProps) {
        return Icon.icon({...p, iconName: 'angle-double-up'});
    },
    angleDown(p?: IconProps) {
        return Icon.icon({...p, iconName: 'angle-down'});
    },
    angleLeft(p?: IconProps) {
        return Icon.icon({...p, iconName: 'angle-left'});
    },
    angleRight(p?: IconProps) {
        return Icon.icon({...p, iconName: 'angle-right'});
    },
    angleUp(p?: IconProps) {
        return Icon.icon({...p, iconName: 'angle-up'});
    },
    arrowDown(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-down'});
    },
    arrowDownToBracket(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-down-to-bracket'});
    },
    arrowDownToSquare(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-down-to-square'});
    },
    arrowLeft(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-left'});
    },
    arrowRight(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-right'});
    },
    arrowRightArrowLeft(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-right-arrow-left'});
    },
    arrowToBottom(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-to-bottom'});
    },
    arrowToLeft(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-to-left'});
    },
    arrowToRight(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-to-right'});
    },
    arrowToTop(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-to-top'});
    },
    arrowUp(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-up'});
    },
    arrowUpFromBracket(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrow-up-from-bracket'});
    },
    arrowsLeftRight(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrows-h'});
    },
    arrowsRotate(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrows-rotate'});
    },
    arrowsUpDown(p?: IconProps) {
        return Icon.icon({...p, iconName: 'arrows-v'});
    },
    asterisk(p?: IconProps) {
        return Icon.icon({...p, iconName: 'asterisk'});
    },
    balanceScale(p?: IconProps) {
        return Icon.icon({...p, iconName: 'balance-scale'});
    },
    balanceScaleLeft(p?: IconProps) {
        return Icon.icon({...p, iconName: 'balance-scale-left'});
    },
    balanceScaleRight(p?: IconProps) {
        return Icon.icon({...p, iconName: 'balance-scale-right'});
    },
    bars(p?: IconProps) {
        return Icon.icon({...p, iconName: 'bars'});
    },
    bolt(p?: IconProps) {
        return Icon.icon({...p, iconName: 'bolt'});
    },
    book(p?: IconProps) {
        return Icon.icon({...p, iconName: 'book'});
    },
    bookmark(p?: IconProps) {
        return Icon.icon({...p, iconName: 'bookmark'});
    },
    books(p?: IconProps) {
        return Icon.icon({...p, iconName: 'books'});
    },
    box(p?: IconProps) {
        return Icon.icon({...p, iconName: 'box'});
    },
    boxFull(p?: IconProps) {
        return Icon.icon({...p, iconName: 'box-full'});
    },
    browser(p?: IconProps) {
        return Icon.icon({...p, iconName: 'browser'});
    },
    bullhorn(p?: IconProps) {
        return Icon.icon({...p, iconName: 'bullhorn'});
    },
    calculator(p?: IconProps) {
        return Icon.icon({...p, iconName: 'calculator'});
    },
    calendar(p?: IconProps) {
        return Icon.icon({...p, iconName: 'calendar-day'});
    },
    camera(p?: IconProps) {
        return Icon.icon({...p, iconName: 'camera'});
    },
    caretLeft(p?: IconProps) {
        return Icon.icon({...p, iconName: 'caret-left'});
    },
    caretRight(p?: IconProps) {
        return Icon.icon({...p, iconName: 'caret-right'});
    },
    chartArea(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chart-area'});
    },
    chartBar(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chart-column'});
    },
    chartLine(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chart-line'});
    },
    chartPie(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chart-pie'});
    },
    check(p?: IconProps) {
        return Icon.icon({...p, iconName: 'check'});
    },
    checkCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'check-circle'});
    },
    checkSquare(p?: IconProps) {
        return Icon.icon({...p, iconName: 'check-square'});
    },
    chess(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chess'});
    },
    chessKnight(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chess-knight-alt'});
    },
    chevronDown(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chevron-down'});
    },
    chevronLeft(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chevron-left'});
    },
    chevronRight(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chevron-right'});
    },
    chevronUp(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chevron-up'});
    },
    circle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'circle'});
    },
    circleNotch(p?: IconProps) {
        return Icon.icon({...p, iconName: 'circle-notch'});
    },
    clipboard(p?: IconProps) {
        return Icon.icon({...p, iconName: 'clipboard'});
    },
    clock(p?: IconProps) {
        return Icon.icon({...p, iconName: 'clock'});
    },
    cloudDownload(p?: IconProps) {
        return Icon.icon({...p, iconName: 'cloud-download'});
    },
    cloudUpload(p?: IconProps) {
        return Icon.icon({...p, iconName: 'cloud-upload'});
    },
    code(p?: IconProps) {
        return Icon.icon({...p, iconName: 'code'});
    },
    collapse(p?: IconProps) {
        return Icon.icon({...p, iconName: 'compress-alt'});
    },
    comment(p?: IconProps) {
        return Icon.icon({
            ...p,
            iconName: 'comment-dots',
            className: classNames(p?.className, 'fa-flip-horizontal')
        });
    },
    contact(p?: IconProps) {
        return Icon.icon({...p, iconName: 'address-card'});
    },
    copy(p?: IconProps) {
        return Icon.icon({...p, iconName: 'copy'});
    },
    cross(p?: IconProps) {
        return Icon.icon({...p, iconName: 'times'});
    },
    crosshairs(p?: IconProps) {
        return Icon.icon({...p, iconName: 'crosshairs'});
    },
    cube(p?: IconProps) {
        return Icon.icon({...p, iconName: 'cube'});
    },
    database(p?: IconProps) {
        return Icon.icon({...p, iconName: 'database'});
    },
    desktop(p?: IconProps) {
        return Icon.icon({...p, iconName: 'desktop'});
    },
    dollarSign(p?: IconProps) {
        return Icon.icon({...p, iconName: 'dollar-sign'});
    },
    dollarSignCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'usd-circle'});
    },
    ellipsisHorizontal(p?: IconProps) {
        return Icon.icon({...p, iconName: 'ellipsis-h'});
    },
    ellipsisVertical(p?: IconProps) {
        return Icon.icon({...p, iconName: 'ellipsis-v'});
    },
    envelope(p?: IconProps) {
        return Icon.icon({...p, iconName: 'envelope'});
    },
    equals(p?: IconProps) {
        return Icon.icon({...p, iconName: 'equals'});
    },
    euroSign(p?: IconProps) {
        return Icon.icon({...p, iconName: 'euro-sign'});
    },
    expand(p?: IconProps) {
        return Icon.icon({...p, iconName: 'expand-alt'});
    },
    experiment(p?: IconProps) {
        return Icon.icon({...p, iconName: 'flask'});
    },
    eye(p?: IconProps) {
        return Icon.icon({...p, iconName: 'eye'});
    },
    eyeSlash(p?: IconProps) {
        return Icon.icon({...p, iconName: 'eye-slash'});
    },
    factory(p?: IconProps) {
        return Icon.icon({...p, iconName: 'industry-alt'});
    },
    file(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file'});
    },
    fileArchive(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-archive'});
    },
    fileCertificate(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-certificate'});
    },
    fileChart(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-chart-column'});
    },
    fileCsv(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-csv'});
    },
    fileExcel(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-excel'});
    },
    fileImage(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-image'});
    },
    filePdf(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-pdf'});
    },
    filePowerpoint(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-powerpoint'});
    },
    fileText(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-alt'});
    },
    fileWord(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-word'});
    },
    fileXml(p?: IconProps) {
        return Icon.icon({...p, iconName: 'file-xml'});
    },
    flag(p?: IconProps) {
        return Icon.icon({...p, iconName: 'flag'});
    },
    floppyDisk(p?: IconProps) {
        return Icon.icon({...p, iconName: 'floppy-disk'});
    },
    folder(p?: IconProps) {
        return Icon.icon({...p, iconName: 'folder'});
    },
    folderOpen(p?: IconProps) {
        return Icon.icon({...p, iconName: 'folder-open'});
    },
    func(p?: IconProps) {
        return Icon.icon({...p, iconName: 'function'});
    },
    fund(p?: IconProps) {
        return Icon.icon({...p, iconName: 'university'});
    },
    funnel(p?: IconProps) {
        return Icon.icon({...p, iconName: 'filter'});
    },
    funnelSlash(p?: IconProps) {
        return Icon.icon({...p, iconName: 'filter-slash'});
    },
    gauge(p?: IconProps) {
        return Icon.icon({...p, iconName: 'gauge-high'});
    },
    gear(p?: IconProps) {
        return Icon.icon({...p, iconName: 'cog'});
    },
    gears(p?: IconProps) {
        return Icon.icon({...p, iconName: 'cogs'});
    },
    gift(p?: IconProps) {
        return Icon.icon({...p, iconName: 'gift'});
    },
    globe(p?: IconProps) {
        return Icon.icon({...p, iconName: 'globe'});
    },
    globeAmericas(p?: IconProps) {
        return Icon.icon({...p, iconName: 'globe-americas'});
    },
    greaterThan(p?: IconProps) {
        return Icon.icon({...p, iconName: 'greater-than'});
    },
    greaterThanEqual(p?: IconProps) {
        return Icon.icon({...p, iconName: 'greater-than-equal'});
    },
    grid(p?: IconProps) {
        return Icon.icon({...p, iconName: 'th'});
    },
    gridLarge(p?: IconProps) {
        return Icon.icon({...p, iconName: 'th-large'});
    },
    gridPanel(p?: IconProps) {
        return Icon.icon({...p, iconName: 'table'});
    },
    grip(p?: IconProps) {
        return Icon.icon({...p, iconName: 'grip-horizontal'});
    },
    hand(p?: IconProps) {
        return Icon.icon({...p, iconName: 'hand-paper'});
    },
    handshake(p?: IconProps) {
        return Icon.icon({...p, iconName: 'handshake'});
    },
    health(p?: IconProps) {
        return Icon.icon({...p, iconName: 'stethoscope'});
    },
    heartRate(p?: IconProps) {
        return Icon.icon({...p, iconName: 'heart-rate'});
    },
    history(p?: IconProps) {
        return Icon.icon({...p, iconName: 'history'});
    },
    home(p?: IconProps) {
        return Icon.icon({...p, iconName: 'home'});
    },
    impersonate(p?: IconProps) {
        return Icon.icon({...p, iconName: 'user-friends'});
    },
    inbox(p?: IconProps) {
        return Icon.icon({...p, iconName: 'inbox'});
    },
    idBadge(p?: IconProps) {
        return Icon.icon({...p, iconName: 'id-badge'});
    },
    infoCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'info-circle'});
    },
    institution(p?: IconProps) {
        return Icon.icon({...p, iconName: 'university'});
    },
    json(p?: IconProps) {
        return Icon.icon({...p, iconName: 'brackets-curly'});
    },
    layout(p?: IconProps) {
        return Icon.icon({...p, iconName: 'table-layout'});
    },
    learn(p?: IconProps) {
        return Icon.icon({...p, iconName: 'graduation-cap'});
    },
    lessThan(p?: IconProps) {
        return Icon.icon({...p, iconName: 'less-than'});
    },
    lessThanEqual(p?: IconProps) {
        return Icon.icon({...p, iconName: 'less-than-equal'});
    },
    link(p?: IconProps) {
        return Icon.icon({...p, iconName: 'link'});
    },
    list(p?: IconProps) {
        return Icon.icon({...p, iconName: 'align-justify'});
    },
    location(p?: IconProps) {
        return Icon.icon({...p, iconName: 'map-marker-alt'});
    },
    lock(p?: IconProps) {
        return Icon.icon({...p, iconName: 'lock'});
    },
    login(p?: IconProps) {
        return Icon.icon({...p, iconName: 'sign-in'});
    },
    logout(p?: IconProps) {
        return Icon.icon({...p, iconName: 'sign-out'});
    },
    magic(p?: IconProps) {
        return Icon.icon({...p, iconName: 'wand-magic-sparkles'});
    },
    magnifyingGlass(p?: IconProps) {
        return Icon.icon({...p, iconName: 'magnifying-glass'});
    },
    mail(p?: IconProps) {
        return Icon.icon({...p, iconName: 'envelope'});
    },
    mapSigns(p?: IconProps) {
        return Icon.icon({...p, iconName: 'map-signs'});
    },
    mask(p?: IconProps) {
        return Icon.icon({...p, iconName: 'mask'});
    },
    memory(p?: IconProps) {
        return Icon.icon({...p, iconName: 'memory'});
    },
    minusCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'minus-circle'});
    },
    mixedChart(p?: IconProps) {
        return Icon.icon({...p, iconName: 'analytics'});
    },
    mobile(p?: IconProps) {
        return Icon.icon({...p, iconName: 'mobile-screen'});
    },
    moon(p?: IconProps) {
        return Icon.icon({...p, iconName: 'moon'});
    },
    news(p?: IconProps) {
        return Icon.icon({...p, iconName: 'newspaper'});
    },
    notEquals(p?: IconProps) {
        return Icon.icon({...p, iconName: 'not-equal'});
    },
    office(p?: IconProps) {
        return Icon.icon({...p, iconName: 'building'});
    },
    openExternal(p?: IconProps) {
        return Icon.icon({...p, iconName: 'external-link'});
    },
    options(p?: IconProps) {
        return Icon.icon({...p, iconName: 'sliders-h-square'});
    },
    paperclip(p?: IconProps) {
        return Icon.icon({...p, iconName: 'paperclip'});
    },
    paste(p?: IconProps) {
        return Icon.icon({...p, iconName: 'paste'});
    },
    pause(p?: IconProps) {
        return Icon.icon({...p, iconName: 'pause'});
    },
    pauseCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'pause-circle'});
    },
    penToSquare(p?: IconProps) {
        return Icon.icon({...p, iconName: 'pen-to-square'});
    },
    phone(p?: IconProps) {
        return Icon.icon({...p, iconName: 'phone-alt'});
    },
    pin(p?: IconProps) {
        return Icon.icon({...p, iconName: 'thumbtack'});
    },
    play(p?: IconProps) {
        return Icon.icon({...p, iconName: 'play'});
    },
    playCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'play-circle'});
    },
    plus(p?: IconProps) {
        return Icon.icon({...p, iconName: 'plus'});
    },
    plusCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'plus-circle'});
    },
    pointerUp(p?: IconProps) {
        return Icon.icon({...p, iconName: 'hand-point-up'});
    },
    portfolio(p?: IconProps) {
        return Icon.icon({...p, iconName: 'briefcase'});
    },
    poundSign(p?: IconProps) {
        return Icon.icon({...p, iconName: 'pound-sign'});
    },
    print(p?: IconProps) {
        return Icon.icon({...p, iconName: 'print'});
    },
    question(p?: IconProps) {
        return Icon.icon({...p, iconName: 'question'});
    },
    questionCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'question-circle'});
    },
    random(p?: IconProps) {
        return Icon.icon({...p, iconName: 'random'});
    },
    receipt(p?: IconProps) {
        return Icon.icon({...p, iconName: 'receipt'});
    },
    redo(p?: IconProps) {
        return Icon.icon({...p, iconName: 'redo'});
    },
    reset(p?: IconProps) {
        return Icon.icon({...p, iconName: 'undo'});
    },
    rocket(p?: IconProps) {
        return Icon.icon({...p, iconName: 'rocket'});
    },
    roles(p?: IconProps) {
        return Icon.icon({...p, iconName: 'user-shield'});
    },
    server(p?: IconProps) {
        return Icon.icon({...p, iconName: 'server'});
    },
    settings(p?: IconProps) {
        return Icon.icon({...p, iconName: 'sliders-h-square'});
    },
    shield(p?: IconProps) {
        return Icon.icon({...p, iconName: 'shield-alt'});
    },
    shieldCheck(p?: IconProps) {
        return Icon.icon({...p, iconName: 'shield-check'});
    },
    shieldHalved(p?: IconProps) {
        return Icon.icon({...p, iconName: 'shield-halved'});
    },
    sigma(p?: IconProps) {
        return Icon.icon({...p, iconName: 'sigma'});
    },
    skull(p?: IconProps) {
        return Icon.icon({...p, iconName: 'skull'});
    },
    slashedCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'ban'});
    },
    sparkles(p?: IconProps) {
        return Icon.icon({...p, iconName: 'sparkles'});
    },
    spinner(p?: IconProps) {
        return Icon.icon({...p, iconName: 'spinner'});
    },
    spinnerScale(p?: IconProps) {
        return Icon.icon({...p, iconName: 'spinner-scale'});
    },
    spinnerThird(p?: IconProps) {
        return Icon.icon({...p, iconName: 'spinner-third'});
    },
    square(p?: IconProps) {
        return Icon.icon({...p, iconName: 'square'});
    },
    squareMinus(p?: IconProps) {
        return Icon.icon({...p, iconName: 'square-minus'});
    },
    star(p?: IconProps) {
        return Icon.icon({...p, iconName: 'star'});
    },
    stop(p?: IconProps) {
        return Icon.icon({...p, iconName: 'stop'});
    },
    stopCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'stop-circle'});
    },
    stopwatch(p?: IconProps) {
        return Icon.icon({...p, iconName: 'stopwatch'});
    },
    sun(p?: IconProps) {
        return Icon.icon({...p, iconName: 'sun'});
    },
    tab(p?: IconProps) {
        return Icon.icon({...p, iconName: 'folder'});
    },
    table(p?: IconProps) {
        return Icon.icon({...p, iconName: 'table'});
    },
    tag(p?: IconProps) {
        return Icon.icon({...p, iconName: 'tag'});
    },
    tags(p?: IconProps) {
        return Icon.icon({...p, iconName: 'tags'});
    },
    target(p?: IconProps) {
        return Icon.icon({...p, iconName: 'bullseye-arrow'});
    },
    terminal(p?: IconProps) {
        return Icon.icon({...p, iconName: 'rectangle-terminal'});
    },
    thumbsDown(p?: IconProps) {
        return Icon.icon({...p, iconName: 'thumbs-down'});
    },
    thumbsUp(p?: IconProps) {
        return Icon.icon({...p, iconName: 'thumbs-up'});
    },
    toast(p?: IconProps) {
        return Icon.icon({...p, iconName: 'bread-slice'});
    },
    toolbox(p?: IconProps) {
        return Icon.icon({...p, iconName: 'toolbox'});
    },
    tools(p?: IconProps) {
        return Icon.icon({...p, iconName: 'tools'});
    },
    trash(p?: IconProps) {
        return Icon.icon({...p, iconName: 'trash-alt'});
    },
    treeGraph(p?: IconProps) {
        return Icon.icon({...p, iconName: 'sitemap'});
    },
    treeList(p?: IconProps) {
        return Icon.icon({...p, iconName: 'list-tree'});
    },
    treeMap(p?: IconProps) {
        return Icon.icon({...p, iconName: 'chart-tree-map'});
    },
    undo(p?: IconProps) {
        return Icon.icon({...p, iconName: 'undo'});
    },
    unlink(p?: IconProps) {
        return Icon.icon({...p, iconName: 'unlink'});
    },
    unlock(p?: IconProps) {
        return Icon.icon({...p, iconName: 'lock-open'});
    },
    user(p?: IconProps) {
        return Icon.icon({...p, iconName: 'user'});
    },
    userCheck(p?: IconProps) {
        return Icon.icon({...p, iconName: 'user-check'});
    },
    userCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'user-circle'});
    },
    userClock(p?: IconProps) {
        return Icon.icon({...p, iconName: 'user-clock'});
    },
    users(p?: IconProps) {
        return Icon.icon({...p, iconName: 'users'});
    },
    warning(p?: IconProps) {
        return Icon.icon({...p, iconName: 'exclamation-triangle'});
    },
    warningCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'exclamation-circle'});
    },
    warningSquare(p?: IconProps) {
        return Icon.icon({...p, iconName: 'exclamation-square'});
    },
    window(p?: IconProps) {
        return Icon.icon({...p, iconName: 'window'});
    },
    wrench(p?: IconProps) {
        return Icon.icon({...p, iconName: 'wrench'});
    },
    x(p?: IconProps) {
        return Icon.icon({...p, iconName: 'times'});
    },
    xCircle(p?: IconProps) {
        return Icon.icon({...p, iconName: 'times-circle'});
    },
    xHexagon(p?: IconProps) {
        return Icon.icon({...p, iconName: 'times-hexagon'});
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
     * code via {@link Icon.register} - that will import it into the FA library, install a typed
     * factory for it on `Icon`, and make it available to {@link IconPicker}.
     */
    icon(opts: SetRequired<IconProps, 'iconName'>): any {
        let {
            iconName,
            prefix = 'far',
            className,
            intent,
            title,
            size,
            asHtml = false,
            ...rest
        } = opts ?? {};
        if (intent) {
            className = classNames(className, `xh-intent-${intent}`);
        }
        return asHtml
            ? iconHtml({iconName, prefix, className, title, size})
            : iconCmp({iconName, prefix, className, title, size, ...rest});
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
     * Existing factories (including Hoist's own) can be replaced by passing `replace: true`,
     * providing a supported way for apps to swap Hoist's choices for their own.
     */
    register(config: IconRegistrationConfig): IconFactory {
        return iconRegistry.register(config);
    },

    /** Register multiple custom icons - see {@link Icon.register}. */
    registerAll(configs: IconRegistrationConfig[]): IconFactory[] {
        return configs.map(it => iconRegistry.register(it));
    },

    /**
     * Render a registered icon by name, for use with dynamic values - e.g. an icon choice
     * persisted by a user via {@link IconPicker}.
     *
     * Accepts either a factory name (`'add'`, `'invoice'`) or an FA name (`'plus'`). Returns null
     * and logs a warning if the requested icon has not been registered.
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
        return iconRegistry.getEntry(name)?.factory ?? null;
    },

    /**
     * Return metadata for a single registered icon, or null if not found. Accepts either a factory
     * name or an FA name - see {@link Icon.get}.
     */
    getCatalogEntry(name: string): IconCatalogEntry {
        return iconRegistry.getEntry(name);
    },

    /** True if an icon with the given factory or FA name has been registered. */
    exists(name: string): boolean {
        return !!iconRegistry.getEntry(name);
    },

    /**
     * Return metadata for all icons known to Hoist - its built-in set plus any registered by the
     * app via {@link Icon.register} - sorted by display name.
     *
     * Used to populate {@link IconPicker}. Note that entries flagged `hidden` are included here
     * but excluded from pickers by default.
     */
    getCatalog(): IconCatalogEntry[] {
        return iconRegistry.getCatalog();
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
iconRegistry.setSource({Icon, iconFactories, aliasFactories});

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
