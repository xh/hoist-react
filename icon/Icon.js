/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from 'hoist/core';

import fontawesome from '@fortawesome/fontawesome';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import solid from '@fortawesome/fontawesome-pro-solid';
import regular from '@fortawesome/fontawesome-pro-regular';
import light from '@fortawesome/fontawesome-pro-light';

fontawesome.library.add(solid, light, regular);

/**
 * Singleton class to provide factories for enumerated icons, each returning a FontAwesome SVG element.
 * By default the "regular" variant of each icon is returned. Pass a `prefix` prop of either "fas"
 * for a heavier-weight "solid" variant or "fal" for a "light" variant.
 *
 * Currently importing the licensed "pro" library with additional icons - note this requires fetching
 * the FA npm package via a registry URL w/license token. See https://fontawesome.com/pro#license.
 */
export const Icon = {
    add(p)           {return fa(p, 'plus-circle')},
    addressCard(p)   {return fa(p, 'address-card')},
    angleLeft(p)     {return fa(p, 'angle-left')},
    angleRight(p)    {return fa(p, 'angle-right')},
    arrowToRight(p)  {return fa(p, 'arrow-to-right')},
    arrowUp(p)       {return fa(p, 'arrow-up')},
    arrowDown(p)     {return fa(p, 'arrow-down')},
    balanceScale(p)  {return fa(p, 'balance-scale')},
    bolt(p)          {return fa(p, 'bolt')},
    book(p)          {return fa(p, 'book')},
    bookmark(p)      {return fa(p, 'bookmark')},
    caretLeft(p)     {return fa(p, 'caret-left')},
    caretRight(p)    {return fa(p, 'caret-right')},
    chartArea(p)     {return fa(p, 'chart-area')},
    chartBar(p)      {return fa(p, 'chart-bar')},
    chartLine(p)     {return fa(p, 'chart-line')},
    chartPie(p)      {return fa(p, 'chart-pie')},
    check(p)         {return fa(p, 'check')},
    checkCircle(p)   {return fa(p, 'check-circle')},
    chess(p)         {return fa(p, 'chess')},
    chessKnight(p)   {return fa(p, 'chess-knight-alt')},
    chevronDown(p)   {return fa(p, 'chevron-down')},
    chevronLeft(p)   {return fa(p, 'chevron-left')},
    chevronRight(p)  {return fa(p, 'chevron-right')},
    chevronUp(p)     {return fa(p, 'chevron-up')},
    clipboard(p)     {return fa(p, 'clipboard')},
    clock(p)         {return fa(p, 'clock')},
    close(p)         {return fa(p, 'times')},
    contact(p)       {return fa(p, 'address-card')},
    comment(p)       {return fa(p, 'comment-dots')},
    copy(p)          {return fa(p, 'copy')},
    cross(p)         {return fa(p, 'times')},
    database(p)      {return fa(p, 'database')},
    disabled(p)      {return fa(p, 'ban')},
    delete(p)        {return fa(p, 'minus-circle')},
    download(p)      {return fa(p, 'download')},
    edit(p)          {return fa(p, 'edit')},
    envelope(p)      {return fa(p, 'envelope')},
    error(p)         {return fa(p, 'times-hexagon')},
    diff(p)          {return fa(p, 'exchange')},
    eye(p)           {return fa(p, 'eye')},
    gauge(p)         {return fa(p, 'tachometer')},
    gear(p)          {return fa(p, 'cog')},
    gears(p)         {return fa(p, 'cogs')},
    gift(p)          {return fa(p, 'gift')},
    hand(p)          {return fa(p, 'hand-paper')},
    home(p)          {return fa(p, 'home')},
    info(p)          {return fa(p, 'info-circle')},
    list(p)          {return fa(p, 'align-justify')},
    lock(p)          {return fa(p, 'lock')},
    login(p)         {return fa(p, 'sign-in')},
    logout(p)        {return fa(p, 'sign-out')},
    mail(p)          {return fa(p, 'envelope')},
    moon(p)          {return fa(p, 'moon')},
    office(p)        {return fa(p, 'building')},
    openExternal(p)  {return fa(p, 'external-link')},
    pause(p)         {return fa(p, 'pause')},
    play(p)          {return fa(p, 'play')},
    portfolio(p)     {return fa(p, 'briefcase')},
    refresh(p)       {return fa(p, 'sync')},
    rocket(p)        {return fa(p, 'rocket')},
    save(p)          {return fa(p, 'save')},
    search(p)        {return fa(p, 'search')},
    sun(p)           {return fa(p, 'sun')},
    sync(p)          {return fa(p, 'sync')},
    thumbsDown(p)    {return fa(p, 'thumbs-down')},
    thumbsUp(p)      {return fa(p, 'thumbs-up')},
    user(p)          {return fa(p, 'user-circle')},
    users(p)         {return fa(p, 'users')},
    warning(p)       {return fa(p, 'exclamation-triangle')},
    wrench(p)        {return fa(p, 'wrench')},
    x(p)             {return fa(p, 'times')},
    xCircle(p)       {return fa(p, 'times-circle')}
};

export const convertIconToSvg = function(icon, opts) {
    const iconDef = fontawesome.findIconDefinition({
        prefix: icon.props.icon[0],
        iconName: icon.props.icon[1]
    });
    return fontawesome.icon(iconDef, opts).html[0];
};

//-----------------------------
// Implementation
//-----------------------------
const faIcon = elemFactory(FontAwesomeIcon);
const fa = function(props, name) {
    const prefix = (props && props.prefix) ? props.prefix : 'far';  // default to regular variant
    return faIcon({icon: [prefix, name], ...props});
};
