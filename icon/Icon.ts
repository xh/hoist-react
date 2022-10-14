/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {last, pickBy, split, toLower} from 'lodash';
import {iconCmp} from './impl/IconCmp';
import {enhanceFaClasses, iconHtml} from './impl/IconHtml';
import {ReactElement} from 'react';
import {BoxProps, Intent} from '@xh/hoist/core';

export interface IconSpec extends BoxProps {

    /** Name of the icon in FontAwesome. */
    iconName?: string;

    /**
     * Prefix or weight of the icon. By default, 'far' for the standard
     * variant of each icon. Pass a value of either 'fas' for a heavier-weight/solid variant
     * or 'fal' for a lighter-weight variant.
     */
    prefix?: 'far'|'fas'|'fal';

    /** Additional css class(es) to apply. */
    className?: string;

    intent?: Intent;

    /** Optional tooltip string. */
    title?: string;

    /** Size of the icon, as specified by the FontAwesome API. */
    size?: 'xs'|'sm'|'lg'|'1x'|'2x'|'3x'|'4x'|'5x'|'6x'|'7x'|'8x'|'9x'|'10x';

    /**  Set to true to return the output as a string containing the raw <svg/> tag.*/
    asHtml?: boolean;
}


/**
 * Singleton class to provide factories for creating standard FontAwesome-based icons.
 *
 * Currently we are importing the licensed "pro" library with additional icons - note this requires
 * fetching the FA npm package via a registry URL w/license token.
 *
 * See https://fontawesome.com/pro#license.
 */
export const Icon = {
    /**
     * Return a standard Hoist FontAwesome-based icon.
     *
     * Note that in order to use an icon with this factory, its definition must have been already
     * imported and registered with FontAwesome via a call to library.add().
     *
     * Applications will often not need to use this factory directly when creating specific
     * icons enumerated by Hoist.  In that case use the supplied factories on the Icon class
     * directly (e.g. Icon.add(), Icon.book(), etc.) These factories will delegate to this method,
     * with the name of a pre-imported icon preset.
     */
    icon({
        iconName,
        prefix = 'far',
        className,
        intent,
        title,
        size,
        asHtml = false,
        ...rest
    }: IconSpec = {}
    ): any {
        if (intent) {
            className = classNames(className, `xh-intent-${intent}`);
        }
        return asHtml ?
            iconHtml({iconName, prefix, className, title, size}) :
            iconCmp({iconName, prefix, className, title, size, ...rest});
    },

    accessDenied(p?: IconSpec)     {return Icon.icon({...p,  iconName: 'ban'})},
    add(p?: IconSpec)              {return Icon.icon({...p,  iconName: 'plus'})},
    addressCard(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'address-card'})},
    analytics(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'analytics'})},
    angleDoubleDown(p?: IconSpec)  {return Icon.icon({...p,  iconName: 'angle-double-down'})},
    angleDoubleLeft(p?: IconSpec)  {return Icon.icon({...p,  iconName: 'angle-double-left'})},
    angleDoubleRight(p?: IconSpec) {return Icon.icon({...p,  iconName: 'angle-double-right'})},
    angleDoubleUp(p?: IconSpec)    {return Icon.icon({...p,  iconName: 'angle-double-up'})},
    angleDown(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'angle-down'})},
    angleLeft(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'angle-left'})},
    angleRight(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'angle-right'})},
    angleUp(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'angle-up'})},
    approve(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'user-check'})},
    arrowDown(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'arrow-down'})},
    arrowLeft(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'arrow-left'})},
    arrowRight(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'arrow-right'})},
    arrowToBottom(p?: IconSpec)    {return Icon.icon({...p,  iconName: 'arrow-to-bottom'})},
    arrowToLeft(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'arrow-to-left'})},
    arrowToRight(p?: IconSpec)     {return Icon.icon({...p,  iconName: 'arrow-to-right'})},
    arrowToTop(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'arrow-to-top'})},
    arrowUp(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'arrow-up'})},
    arrowsLeftRight(p?: IconSpec)  {return Icon.icon({...p,  iconName: 'arrows-h'})},
    arrowsUpDown(p?: IconSpec)     {return Icon.icon({...p,  iconName: 'arrows-v'})},
    attachment(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'paperclip'})},
    balanceScale(p?: IconSpec)     {return Icon.icon({...p,  iconName: 'balance-scale'})},
    balanceScaleLeft(p?: IconSpec) {return Icon.icon({...p,  iconName: 'balance-scale-left'})},
    balanceScaleRight(p?: IconSpec) {return Icon.icon({...p, iconName: 'balance-scale-right'})},
    bars(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'bars'})},
    browser(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'browser'})},
    bolt(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'bolt'})},
    book(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'book'})},
    bookmark(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'bookmark'})},
    books(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'books'})},
    box(p?: IconSpec)              {return Icon.icon({...p,  iconName: 'box'})},
    boxFull(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'box-full'})},
    bullhorn(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'bullhorn'})},
    calculator(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'calculator'})},
    calendar(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'calendar-day'})},
    camera(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'camera'})},
    caretLeft(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'caret-left'})},
    caretRight(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'caret-right'})},
    chartArea(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'chart-area'})},
    chartBar(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'chart-column'})},
    chartLine(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'chart-line'})},
    chartPie(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'chart-pie'})},
    check(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'check'})},
    checkCircle(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'check-circle'})},
    chess(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'chess'})},
    chessKnight(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'chess-knight-alt'})},
    chevronDown(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'chevron-down'})},
    chevronLeft(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'chevron-left'})},
    chevronRight(p?: IconSpec)     {return Icon.icon({...p,  iconName: 'chevron-right'})},
    chevronUp(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'chevron-up'})},
    circle(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'circle'})},
    clipboard(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'clipboard'})},
    clock(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'clock'})},
    close(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'times'})},
    cloudDownload(p?: IconSpec)    {return Icon.icon({...p,  iconName: 'cloud-download'})},
    cloudUpload(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'cloud-upload'})},
    code(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'code'})},
    collapse(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'compress-alt'})},
    // Sorry FontAwesome, but I swear your chat bubble is backwards....  - ATM
    comment(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'comment-dots', className: classNames(p?.className, 'fa-flip-horizontal')})},
    contact(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'address-card'})},
    copy(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'copy'})},
    cross(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'times'})},
    crosshairs(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'crosshairs'})},
    cube(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'cube'})},
    danger(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'times-circle'})},
    database(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'database'})},
    delete(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'minus-circle'})},
    desktop(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'desktop'})},
    detail(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'search'})},
    diff(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'exchange'})},
    disabled(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'ban'})},
    dollarSign(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'dollar-sign'})},
    dollarSignCircle(p?: IconSpec) {return Icon.icon({...p,  iconName: 'usd-circle'})},
    download(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'arrow-down-to-bracket'})},
    edit(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'edit'})},
    ellipsisHorizontal(p?: IconSpec) {return Icon.icon({...p, iconName: 'ellipsis-h'})},
    ellipsisVertical(p?: IconSpec) {return Icon.icon({...p,  iconName: 'ellipsis-v'})},
    envelope(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'envelope'})},
    equals(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'equals'})},
    error(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'times-hexagon'})},
    euroSign(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'euro-sign'})},
    expand(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'expand-alt'})},
    experiment(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'flask'})},
    eye(p?: IconSpec)              {return Icon.icon({...p,  iconName: 'eye'})},
    eyeSlash(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'eye-slash'})},
    factory(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'industry-alt'})},
    favorite(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'star'})},
    file(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'file'})},
    fileArchive(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'file-archive'})},
    fileCsv(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'file-csv'})},
    fileExcel(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'file-excel'})},
    fileImage(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'file-image'})},
    filePdf(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'file-pdf'})},
    filePowerpoint(p?: IconSpec)   {return Icon.icon({...p,  iconName: 'file-powerpoint'})},
    fileText(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'file-alt'})},
    fileWord(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'file-word'})},
    filter(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'filter'})},
    flag(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'flag'})},
    folder(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'folder'})},
    folderOpen(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'folder-open'})},
    fund(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'university'})},
    func(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'function'})},
    gauge(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'gauge-high'})},
    gear(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'cog'})},
    gears(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'cogs'})},
    gift(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'gift'})},
    globe(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'globe'})},
    globeAmericas(p?: IconSpec)    {return Icon.icon({...p,  iconName: 'globe-americas'})},
    greaterThan(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'greater-than'})},
    greaterThanEqual(p?: IconSpec) {return Icon.icon({...p,  iconName: 'greater-than-equal'})},
    grid(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'th'})},
    gridLarge(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'th-large'})},
    gridPanel(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'table'})},
    grip(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'grip-horizontal'})},
    hand(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'hand-paper'})},
    handshake(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'handshake'})},
    health(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'stethoscope'})},
    heartRate(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'heart-rate'})},
    history(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'history'})},
    home(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'home'})},
    impersonate(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'user-friends'})},
    inbox(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'inbox'})},
    info(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'info-circle'})},
    institution(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'university'})},
    instrument(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'file-certificate'})},
    json(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'brackets-curly'})},
    layout(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'table-layout'})},
    learn(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'graduation-cap'})},
    lessThan(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'less-than'})},
    lessThanEqual(p?: IconSpec)    {return Icon.icon({...p,  iconName: 'less-than-equal'})},
    link(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'link'})},
    list(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'align-justify'})},
    location(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'map-marker-alt'})},
    lock(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'lock'})},
    login(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'sign-in'})},
    logout(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'sign-out'})},
    magic(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'wand-magic-sparkles'})},
    mail(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'envelope'})},
    mapSigns(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'map-signs'})},
    mask(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'mask'})},
    minusCircle(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'minus-circle'})},
    mobile(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'mobile-screen'})},
    moon(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'moon'})},
    news(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'newspaper'})},
    notEquals(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'not-equal'})},
    office(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'building'})},
    openExternal(p?: IconSpec)     {return Icon.icon({...p,  iconName: 'external-link'})},
    options(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'sliders-h-square'})},
    paste(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'paste'})},
    pause(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'pause'})},
    pauseCircle(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'pause-circle'})},
    phone(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'phone-alt'})},
    pin(p?: IconSpec)              {return Icon.icon({...p,  iconName: 'thumbtack'})},
    play(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'play'})},
    playCircle(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'play-circle'})},
    plus(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'plus'})},
    plusCircle(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'plus-circle'})},
    pointerUp(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'hand-point-up'})},
    portfolio(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'briefcase'})},
    poundSign(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'pound-sign'})},
    print(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'print'})},
    question(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'question'})},
    questionCircle(p?: IconSpec)   {return Icon.icon({...p,  iconName: 'question-circle'})},
    random(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'random'})},
    receipt(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'receipt'})},
    redo(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'redo'})},
    report(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'file-chart-column'})},
    refresh(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'sync'})},
    reset(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'undo'})},
    rocket(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'rocket'})},
    save(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'save'})},
    search(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'search'})},
    server(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'server'})},
    settings(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'sliders-h-square'})},
    shield(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'shield-alt'})},
    shieldCheck(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'shield-check'})},
    sigma(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'sigma'})},
    skull(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'skull'})},
    spinner(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'spinner'})},
    star(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'star'})},
    stop(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'stop'})},
    stopCircle(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'stop-circle'})},
    stopwatch(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'stopwatch'})},
    success(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'check-circle'})},
    sun(p?: IconSpec)              {return Icon.icon({...p,  iconName: 'sun'})},
    sync(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'sync'})},
    tab(p?: IconSpec)              {return Icon.icon({...p,  iconName: 'folder'})},
    table(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'table'})},
    tag(p?: IconSpec)              {return Icon.icon({...p,  iconName: 'tag'})},
    tags(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'tags'})},
    target(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'bullseye-arrow'})},
    terminal(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'rectangle-terminal'})},
    thumbsDown(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'thumbs-down'})},
    thumbsUp(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'thumbs-up'})},
    toast(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'bread-slice'})},
    toolbox(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'toolbox'})},
    tools(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'tools'})},
    trash(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'trash-alt'})},
    transaction(p?: IconSpec)      {return Icon.icon({...p,  iconName: 'exchange'})},
    treeList(p?: IconSpec)         {return Icon.icon({...p,  iconName: 'list-tree'})},
    undo(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'undo'})},
    unlink(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'unlink'})},
    unlock(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'lock-open'})},
    upload(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'arrow-up-from-bracket'})},
    user(p?: IconSpec)             {return Icon.icon({...p,  iconName: 'user'})},
    userCircle(p?: IconSpec)       {return Icon.icon({...p,  iconName: 'user-circle'})},
    userClock(p?: IconSpec)        {return Icon.icon({...p,  iconName: 'user-clock'})},
    users(p?: IconSpec)            {return Icon.icon({...p,  iconName: 'users'})},
    warning(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'exclamation-triangle'})},
    warningCircle(p?: IconSpec)    {return Icon.icon({...p,  iconName: 'exclamation-circle'})},
    warningSquare(p?: IconSpec)    {return Icon.icon({...p,  iconName: 'exclamation-square'})},
    window(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'window'})},
    wrench(p?: IconSpec)           {return Icon.icon({...p,  iconName: 'wrench'})},
    x(p?: IconSpec)                {return Icon.icon({...p,  iconName: 'times'})},
    xCircle(p?: IconSpec)          {return Icon.icon({...p,  iconName: 'times-circle'})},

    /**
     * Create an Icon for a file with default styling appropriate for the file type.
     *
     * @param {Object} c - See Icon.icon().
     * @param {string} [c.filename] - filename to be used to create icon.  Name will be parsed
     *      for an extension.  If not provided or recognized, a default icon will be returned.
     */
    fileIcon({filename, ...rest}: IconSpec&{filename: string}): ReactElement|string {
        const {factory, className} = getFileIconConfig(filename);

        return factory({...rest, className: classNames(className, rest.className)});
    },

    /**
     * Returns an empty div with FA sizing classes applied. Can be used to take up room in a layout
     * where an icon might otherwise go - e.g. to align a series of menu items, where some items do
     * not have an icon but others do.
     */
    placeholder({size, asHtml = false}: IconSpec = {}): ReactElement|string {
        const className = enhanceFaClasses('xh-icon--placeholder', size);
        return asHtml ? `<div class="${className}"></div>` : div({className});
    }
};


/**
 * Translate an icon into an html <svg/> tag.
 *
 * Not typically used by applications.  Applications that need html for an icon, e.g.
 * for a grid column renderer should use the 'asHtml' flag on the Icon factory functions
 * instead.
 *
 * @param iconElem - react element representing a Hoist Icon component.
 *      This must be element created by Hoist's built-in Icon factories.
 * @return  html of the <svg> tag representing the icon.
 */
export function convertIconToHtml(iconElem: ReactElement): string {
    throwIf(!(iconElem?.type as any)?.isHoistComponent,
        'Icon not provided, or not created by a Hoist Icon factory - cannot convert to HTML/SVG.'
    );
    return iconHtml(iconElem.props);
}

/**
 * Serialize an icon into a form that can be persisted.
 *
 * @param iconElem - react element representing a icon component.
 *      This must be an element created by Hoist's built-in Icon factories.
 * @returns json representation of icon.
 */
export function serializeIcon(iconElem: ReactElement): any {
    throwIf(!(iconElem?.type as any)?.isHoistComponent,
        'Icon not provided, or not created by a Hoist Icon factory - cannot serialize.'
    );

    return pickBy(iconElem.props);
}

/**
 * Deserialize an icon.
 *
 * This is the inverse operation of serializeIcon().
 *
 * @param iconDef - json representation of icon, produced by serializeIcon.
 * @returns react element representing a FontAwesome icon component.
 *      This is the form of element created by Hoist's built-in Icon class factories.
 */
export function deserializeIcon(iconDef: any): ReactElement|string {
    return Icon.icon(iconDef);
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
        case 'zip':
            return {factory: Icon.fileArchive};
        default:
            return {factory: Icon.file};
    }
}
