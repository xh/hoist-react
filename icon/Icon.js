/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {last, pickBy, split, toLower} from 'lodash';
import {iconCmp} from './impl/IconCmp';
import {enhanceFaClasses, iconHtml} from './impl/IconHtml';


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
     *
     * @param {Object} c - configuration object.
     * @param {string} c.iconName - name of the icon in FontAwesome.
     * @param {string} [c.prefix] - prefix or weight of the icon. By default, 'far' for the standard
     *      variant of each icon. Pass a value of either 'fas' for a heavier-weight/solid variant
     *      or 'fal' for a lighter-weight variant.
     * @param {string} [c.className] - additional css class(es) to apply.
     * @param {string} [c.title] - optional tooltip string
     * @param {string} [c.size] - size of the icon, as specified by FontAwesome API.
     *      One of: 'xs','sm', 'lg', '1x','2x','3x','4x','5x','6x','7x','8x','9x','10x'
     * @param {boolean} [c.asHtml] - Set to true to return the output as a string containing the
     *      raw <svg/> tag.  Use this option for non-react APIs, such as when writing renderers
     *      for ag-Grid.
     * @param {...*} [c.rest] - Additional props to be passed directly to underlying
     *      component.  These arguments are ignored when asHtml = true.
     * @returns {(Element|string)}
     */
    icon({
        iconName,
        prefix = 'far',
        className,
        title,
        size,
        asHtml = false,
        ...rest
    } = {}) {
        return asHtml ?
            iconHtml({iconName, prefix, className, title, size}) :
            iconCmp({iconName, prefix, className, title, size, ...rest});
    },

    accessDenied(p)     {return Icon.icon({...p,  iconName: 'ban'})},
    add(p)              {return Icon.icon({...p,  iconName: 'plus-circle'})},
    addressCard(p)      {return Icon.icon({...p,  iconName: 'address-card'})},
    analytics(p)        {return Icon.icon({...p,  iconName: 'analytics'})},
    angleDoubleDown(p)  {return Icon.icon({...p,  iconName: 'angle-double-down'})},
    angleDoubleLeft(p)  {return Icon.icon({...p,  iconName: 'angle-double-left'})},
    angleDoubleRight(p) {return Icon.icon({...p,  iconName: 'angle-double-right'})},
    angleDoubleUp(p)    {return Icon.icon({...p,  iconName: 'angle-double-up'})},
    angleDown(p)        {return Icon.icon({...p,  iconName: 'angle-down'})},
    angleLeft(p)        {return Icon.icon({...p,  iconName: 'angle-left'})},
    angleRight(p)       {return Icon.icon({...p,  iconName: 'angle-right'})},
    angleUp(p)          {return Icon.icon({...p,  iconName: 'angle-up'})},
    approve(p)          {return Icon.icon({...p,  iconName: 'user-check'})},
    arrowDown(p)        {return Icon.icon({...p,  iconName: 'arrow-down'})},
    arrowLeft(p)        {return Icon.icon({...p,  iconName: 'arrow-left'})},
    arrowRight(p)       {return Icon.icon({...p,  iconName: 'arrow-right'})},
    arrowToBottom(p)    {return Icon.icon({...p,  iconName: 'arrow-to-bottom'})},
    arrowToLeft(p)      {return Icon.icon({...p,  iconName: 'arrow-to-left'})},
    arrowToRight(p)     {return Icon.icon({...p,  iconName: 'arrow-to-right'})},
    arrowToTop(p)       {return Icon.icon({...p,  iconName: 'arrow-to-top'})},
    arrowUp(p)          {return Icon.icon({...p,  iconName: 'arrow-up'})},
    arrowsLeftRight(p)  {return Icon.icon({...p,  iconName: 'arrows-h'})},
    arrowsUpDown(p)     {return Icon.icon({...p,  iconName: 'arrows-v'})},
    attachment(p)       {return Icon.icon({...p,  iconName: 'paperclip'})},
    balanceScale(p)     {return Icon.icon({...p,  iconName: 'balance-scale'})},
    balanceScaleLeft(p) {return Icon.icon({...p,  iconName: 'balance-scale-left'})},
    balanceScaleRight(p) {return Icon.icon({...p, iconName: 'balance-scale-right'})},
    bars(p)             {return Icon.icon({...p,  iconName: 'bars'})},
    bolt(p)             {return Icon.icon({...p,  iconName: 'bolt'})},
    book(p)             {return Icon.icon({...p,  iconName: 'book'})},
    bookmark(p)         {return Icon.icon({...p,  iconName: 'bookmark'})},
    books(p)            {return Icon.icon({...p,  iconName: 'books'})},
    box(p)              {return Icon.icon({...p,  iconName: 'box'})},
    boxFull(p)          {return Icon.icon({...p,  iconName: 'box-full'})},
    bullhorn(p)         {return Icon.icon({...p,  iconName: 'bullhorn'})},
    calculator(p)       {return Icon.icon({...p,  iconName: 'calculator'})},
    calendar(p)         {return Icon.icon({...p,  iconName: 'calendar-alt'})},
    camera(p)           {return Icon.icon({...p,  iconName: 'camera'})},
    caretLeft(p)        {return Icon.icon({...p,  iconName: 'caret-left'})},
    caretRight(p)       {return Icon.icon({...p,  iconName: 'caret-right'})},
    chartArea(p)        {return Icon.icon({...p,  iconName: 'chart-area'})},
    chartBar(p)         {return Icon.icon({...p,  iconName: 'chart-bar'})},
    chartLine(p)        {return Icon.icon({...p,  iconName: 'chart-line'})},
    chartPie(p)         {return Icon.icon({...p,  iconName: 'chart-pie'})},
    check(p)            {return Icon.icon({...p,  iconName: 'check'})},
    checkCircle(p)      {return Icon.icon({...p,  iconName: 'check-circle'})},
    chess(p)            {return Icon.icon({...p,  iconName: 'chess'})},
    chessKnight(p)      {return Icon.icon({...p,  iconName: 'chess-knight-alt'})},
    chevronDown(p)      {return Icon.icon({...p,  iconName: 'chevron-down'})},
    chevronLeft(p)      {return Icon.icon({...p,  iconName: 'chevron-left'})},
    chevronRight(p)     {return Icon.icon({...p,  iconName: 'chevron-right'})},
    chevronUp(p)        {return Icon.icon({...p,  iconName: 'chevron-up'})},
    circle(p)           {return Icon.icon({...p,  iconName: 'circle'})},
    clipboard(p)        {return Icon.icon({...p,  iconName: 'clipboard'})},
    clock(p)            {return Icon.icon({...p,  iconName: 'clock'})},
    close(p)            {return Icon.icon({...p,  iconName: 'times'})},
    cloudDownload(p)    {return Icon.icon({...p,  iconName: 'cloud-download'})},
    cloudUpload(p)      {return Icon.icon({...p,  iconName: 'cloud-upload'})},
    code(p)             {return Icon.icon({...p,  iconName: 'code'})},
    collapse(p)         {return Icon.icon({...p,  iconName: 'compress-alt'})},
    // Sorry FontAwesome, but I swear your chat bubble is backwards....  - ATM
    comment(p)          {return Icon.icon({...p,  iconName: 'comment-dots', className: classNames(p?.className, 'fa-flip-horizontal')})},
    contact(p)          {return Icon.icon({...p,  iconName: 'address-card'})},
    copy(p)             {return Icon.icon({...p,  iconName: 'copy'})},
    cross(p)            {return Icon.icon({...p,  iconName: 'times'})},
    crosshairs(p)       {return Icon.icon({...p,  iconName: 'crosshairs'})},
    cube(p)             {return Icon.icon({...p,  iconName: 'cube'})},
    database(p)         {return Icon.icon({...p,  iconName: 'database'})},
    delete(p)           {return Icon.icon({...p,  iconName: 'minus-circle'})},
    desktop(p)          {return Icon.icon({...p,  iconName: 'desktop'})},
    detail(p)           {return Icon.icon({...p,  iconName: 'search'})},
    diff(p)             {return Icon.icon({...p,  iconName: 'exchange'})},
    disabled(p)         {return Icon.icon({...p,  iconName: 'ban'})},
    dollarSign(p)       {return Icon.icon({...p,  iconName: 'dollar-sign'})},
    dollarSignCircle(p) {return Icon.icon({...p,  iconName: 'usd-circle'})},
    download(p)         {return Icon.icon({...p,  iconName: 'download'})},
    edit(p)             {return Icon.icon({...p,  iconName: 'edit'})},
    ellipsisHorizontal(p) {return Icon.icon({...p, iconName: 'ellipsis-h'})},
    ellipsisVertical(p) {return Icon.icon({...p,  iconName: 'ellipsis-v'})},
    envelope(p)         {return Icon.icon({...p,  iconName: 'envelope'})},
    equals(p)           {return Icon.icon({...p,  iconName: 'equals'})},
    error(p)            {return Icon.icon({...p,  iconName: 'times-hexagon'})},
    euroSign(p)         {return Icon.icon({...p,  iconName: 'euro-sign'})},
    expand(p)           {return Icon.icon({...p,  iconName: 'expand-alt'})},
    experiment(p)       {return Icon.icon({...p,  iconName: 'flask'})},
    eye(p)              {return Icon.icon({...p,  iconName: 'eye'})},
    eyeSlash(p)         {return Icon.icon({...p,  iconName: 'eye-slash'})},
    factory(p)          {return Icon.icon({...p,  iconName: 'industry-alt'})},
    favorite(p)         {return Icon.icon({...p,  iconName: 'star'})},
    file(p)             {return Icon.icon({...p,  iconName: 'file'})},
    fileArchive(p)      {return Icon.icon({...p,  iconName: 'file-archive'})},
    fileCsv(p)          {return Icon.icon({...p,  iconName: 'file-csv'})},
    fileExcel(p)        {return Icon.icon({...p,  iconName: 'file-excel'})},
    fileImage(p)        {return Icon.icon({...p,  iconName: 'file-image'})},
    filePdf(p)          {return Icon.icon({...p,  iconName: 'file-pdf'})},
    filePowerpoint(p)   {return Icon.icon({...p,  iconName: 'file-powerpoint'})},
    fileText(p)         {return Icon.icon({...p,  iconName: 'file-alt'})},
    fileWord(p)         {return Icon.icon({...p,  iconName: 'file-word'})},
    filter(p)           {return Icon.icon({...p,  iconName: 'filter'})},
    flag(p)             {return Icon.icon({...p,  iconName: 'flag'})},
    folder(p)           {return Icon.icon({...p,  iconName: 'folder'})},
    folderOpen(p)       {return Icon.icon({...p,  iconName: 'folder-open'})},
    fund(p)             {return Icon.icon({...p,  iconName: 'university'})},
    gauge(p)            {return Icon.icon({...p,  iconName: 'tachometer'})},
    gear(p)             {return Icon.icon({...p,  iconName: 'cog'})},
    gears(p)            {return Icon.icon({...p,  iconName: 'cogs'})},
    gift(p)             {return Icon.icon({...p,  iconName: 'gift'})},
    globe(p)            {return Icon.icon({...p,  iconName: 'globe'})},
    grid(p)             {return Icon.icon({...p,  iconName: 'th'})},
    gridLarge(p)        {return Icon.icon({...p,  iconName: 'th-large'})},
    gridPanel(p)        {return Icon.icon({...p,  iconName: 'table'})},
    grip(p)             {return Icon.icon({...p,  iconName: 'grip-horizontal'})},
    hand(p)             {return Icon.icon({...p,  iconName: 'hand-paper'})},
    handshake(p)        {return Icon.icon({...p,  iconName: 'handshake'})},
    health(p)           {return Icon.icon({...p,  iconName: 'stethoscope'})},
    history(p)          {return Icon.icon({...p,  iconName: 'history'})},
    home(p)             {return Icon.icon({...p,  iconName: 'home'})},
    impersonate(p)      {return Icon.icon({...p,  iconName: 'user-friends'})},
    inbox(p)            {return Icon.icon({...p,  iconName: 'inbox'})},
    info(p)             {return Icon.icon({...p,  iconName: 'info-circle'})},
    institution(p)      {return Icon.icon({...p,  iconName: 'university'})},
    json(p)             {return Icon.icon({...p,  iconName: 'brackets-curly'})},
    learn(p)            {return Icon.icon({...p,  iconName: 'graduation-cap'})},
    link(p)             {return Icon.icon({...p,  iconName: 'link'})},
    list(p)             {return Icon.icon({...p,  iconName: 'align-justify'})},
    location(p)         {return Icon.icon({...p,  iconName: 'map-marker-alt'})},
    lock(p)             {return Icon.icon({...p,  iconName: 'lock'})},
    login(p)            {return Icon.icon({...p,  iconName: 'sign-in'})},
    logout(p)           {return Icon.icon({...p,  iconName: 'sign-out'})},
    magic(p)            {return Icon.icon({...p,  iconName: 'magic'})},
    mail(p)             {return Icon.icon({...p,  iconName: 'envelope'})},
    mapSigns(p)         {return Icon.icon({...p,  iconName: 'map-signs'})},
    mask(p)             {return Icon.icon({...p,  iconName: 'mask'})},
    minusCircle(p)      {return Icon.icon({...p,  iconName: 'minus-circle'})},
    moon(p)             {return Icon.icon({...p,  iconName: 'moon'})},
    news(p)             {return Icon.icon({...p,  iconName: 'newspaper'})},
    office(p)           {return Icon.icon({...p,  iconName: 'building'})},
    openExternal(p)     {return Icon.icon({...p,  iconName: 'external-link'})},
    options(p)          {return Icon.icon({...p,  iconName: 'sliders-h-square'})},
    paste(p)            {return Icon.icon({...p,  iconName: 'paste'})},
    pause(p)            {return Icon.icon({...p,  iconName: 'pause'})},
    pauseCircle(p)      {return Icon.icon({...p,  iconName: 'pause-circle'})},
    pin(p)              {return Icon.icon({...p,  iconName: 'thumbtack'})},
    play(p)             {return Icon.icon({...p,  iconName: 'play'})},
    playCircle(p)       {return Icon.icon({...p,  iconName: 'play-circle'})},
    plus(p)             {return Icon.icon({...p,  iconName: 'plus'})},
    plusCircle(p)       {return Icon.icon({...p,  iconName: 'plus-circle'})},
    portfolio(p)        {return Icon.icon({...p,  iconName: 'briefcase'})},
    poundSign(p)        {return Icon.icon({...p,  iconName: 'pound-sign'})},
    print(p)            {return Icon.icon({...p,  iconName: 'print'})},
    question(p)         {return Icon.icon({...p,  iconName: 'question'})},
    questionCircle(p)   {return Icon.icon({...p,  iconName: 'question-circle'})},
    random(p)           {return Icon.icon({...p,  iconName: 'random'})},
    redo(p)             {return Icon.icon({...p,  iconName: 'redo'})},
    refresh(p)          {return Icon.icon({...p,  iconName: 'sync'})},
    reset(p)            {return Icon.icon({...p,  iconName: 'undo'})},
    rocket(p)           {return Icon.icon({...p,  iconName: 'rocket'})},
    save(p)             {return Icon.icon({...p,  iconName: 'save'})},
    search(p)           {return Icon.icon({...p,  iconName: 'search'})},
    server(p)           {return Icon.icon({...p,  iconName: 'server'})},
    settings(p)         {return Icon.icon({...p,  iconName: 'sliders-h-square'})},
    shield(p)           {return Icon.icon({...p,  iconName: 'shield-alt'})},
    shieldCheck(p)      {return Icon.icon({...p,  iconName: 'shield-check'})},
    sigma(p)            {return Icon.icon({...p,  iconName: 'sigma'})},
    skull(p)            {return Icon.icon({...p,  iconName: 'skull'})},
    spinner(p)          {return Icon.icon({...p,  iconName: 'spinner'})},
    stop(p)             {return Icon.icon({...p,  iconName: 'stop'})},
    stopCircle(p)       {return Icon.icon({...p,  iconName: 'stop-circle'})},
    stopwatch(p)        {return Icon.icon({...p,  iconName: 'stopwatch'})},
    sun(p)              {return Icon.icon({...p,  iconName: 'sun'})},
    sync(p)             {return Icon.icon({...p,  iconName: 'sync'})},
    tab(p)              {return Icon.icon({...p,  iconName: 'folder'})},
    table(p)            {return Icon.icon({...p,  iconName: 'table'})},
    target(p)           {return Icon.icon({...p,  iconName: 'bullseye-arrow'})},
    thumbsDown(p)       {return Icon.icon({...p,  iconName: 'thumbs-down'})},
    thumbsUp(p)         {return Icon.icon({...p,  iconName: 'thumbs-up'})},
    toast(p)            {return Icon.icon({...p,  iconName: 'bread-slice'})},
    toolbox(p)          {return Icon.icon({...p,  iconName: 'toolbox'})},
    tools(p)            {return Icon.icon({...p,  iconName: 'tools'})},
    trash(p)            {return Icon.icon({...p,  iconName: 'trash-alt'})},
    transaction(p)      {return Icon.icon({...p,  iconName: 'exchange'})},
    treeList(p)         {return Icon.icon({...p,  iconName: 'stream'})},
    undo(p)             {return Icon.icon({...p,  iconName: 'undo'})},
    unlink(p)           {return Icon.icon({...p,  iconName: 'unlink'})},
    unlock(p)           {return Icon.icon({...p,  iconName: 'lock-open'})},
    upload(p)           {return Icon.icon({...p,  iconName: 'upload'})},
    user(p)             {return Icon.icon({...p,  iconName: 'user-circle'})},
    userClock(p)        {return Icon.icon({...p,  iconName: 'user-clock'})},
    users(p)            {return Icon.icon({...p,  iconName: 'users'})},
    warning(p)          {return Icon.icon({...p,  iconName: 'exclamation-triangle'})},
    warningCircle(p)    {return Icon.icon({...p,  iconName: 'exclamation-circle'})},
    warningSquare(p)    {return Icon.icon({...p,  iconName: 'exclamation-square'})},
    window(p)           {return Icon.icon({...p,  iconName: 'window'})},
    wrench(p)           {return Icon.icon({...p,  iconName: 'wrench'})},
    x(p)                {return Icon.icon({...p,  iconName: 'times'})},
    xCircle(p)          {return Icon.icon({...p,  iconName: 'times-circle'})},

    /**
     * Create an Icon for a file with default styling appropriate for the file type.
     *
     * @param {Object} c - See Icon.icon().
     * @param {string} [c.filename] - filename to be used to create icon.  Name will be parsed
     *      for an extension.  If not provided or recognized, a default icon will be returned.
     * @returns {(Element|string)}
     */
    fileIcon({filename, ...rest}) {
        const {factory, className} = getFileIconConfig(filename);

        return factory({...rest, className: classNames(className, rest.className)});
    },

    /**
     * Returns an empty div with FA sizing classes applied. Can be used to take up room in a layout
     * where an icon might otherwise go - e.g. to align a series of menu items, where some items do
     * not have an icon but others do.
     * @param {Object} [c]
     * @param {string} [c.size]
     * @param {boolean} [c.asHtml]
     * @returns {(Element|string)}
     */
    placeholder({size, asHtml = false} = {}) {
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
 * @param {Element} iconElem - react element representing a Hoist Icon component.
 *      This must be element created by Hoist's built-in Icon factories.
 * @return {string} - html of the <svg> tag representing the icon.
 */
export function convertIconToHtml(iconElem) {
    throwIf(!iconElem.type?.isHoistComponent,
        'Icon not created by a Hoist Icon factory - cannot convert to SVG'
    );
    return iconHtml(iconElem.props);
}

/**
 * Serialize an icon into a form that can be persisted.
 *
 * @param {Element} iconElem - react element representing a icon component.
 *      This must be an element created by Hoist's built-in Icon factories.
 * @returns {Object} - json representation of icon.
 */
export function serializeIcon(iconElem) {
    throwIf(!iconElem.type?.isHoistComponent,
        'Attempted to serialize an icon not created by a Hoist Icon factory.'
    );

    return pickBy(iconElem.props);
}

/**
 * Deserialize an icon.
 *
 * This is the inverse operation of serializeIcon().
 *
 * @param {Object} iconDef - json representation of icon, produced by serializeIcon.
 * @returns {Element} - react element representing a FontAwesome icon component.
 *      This is the form of element created by Hoist's built-in Icon class factories.
 */
export function deserializeIcon(iconDef) {
    return Icon.icon(iconDef);
}

//-----------------------------
// Implementation
//-----------------------------
function getFileIconConfig(filename) {
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
