/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {find, isEmpty, lowerCase, words} from 'lodash';
import type {ReactElement} from 'react';

import {ChangelogDialogModel} from '@xh/hoist/appcontainer/ChangelogDialogModel';
import {badge} from '@xh/hoist/cmp/badge';
import {a, div, filler, h2, h3, li, span, ul} from '@xh/hoist/cmp/layout';
import {markdown} from '@xh/hoist/cmp/markdown';
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import type {ChangelogCategory, ChangelogVersion} from '@xh/hoist/svc';

import './ChangelogDialog.scss';

export const changelogDialog = hoistCmp.factory({
    displayName: 'ChangelogDialog',
    model: uses(ChangelogDialogModel),

    render({model}) {
        if (!model.isOpen) return null;

        return dialog({
            isOpen: true,
            title: `${XH.appName} Release Notes`,
            icon: Icon.gift(),
            className: 'xh-changelog',
            children: changelogContents(),
            onClose: () => model.hide()
        });
    }
});

const changelogContents = hoistCmp.factory<ChangelogDialogModel>(({model}) => {
    const {versions} = XH.changelogService;
    return panel({
        children: div({
            className: 'xh-changelog__inner',
            children: versions.map(it => version({version: it, key: it.version}))
        }),
        bbar: [
            filler(),
            button({
                text: 'Close',
                intent: 'primary',
                testId: 'xh-changelog-close-btn',
                onClick: () => model.hide()
            })
        ]
    });
});

const version = hoistCmp.factory<HoistProps & {version: ChangelogVersion}>(({version}) => {
    const {categories, date, isCurrentVersion, isUnreleased} = version;

    return div({
        className: classNames('xh-changelog__version', {
            'xh-changelog__version--current': isCurrentVersion,
            'xh-changelog__version--unreleased': isUnreleased
        }),
        children: [
            div({
                className: 'xh-changelog__version__header',
                children: [
                    h2(version.version),
                    versionTag({omit: !isUnreleased, text: 'Unreleased'}),
                    versionTag({omit: !isCurrentVersion, text: 'Current'}),
                    filler(),
                    span({
                        omit: !date,
                        className: 'xh-changelog__version__date',
                        children: fmtDate(date, 'MMM D, YYYY') || date
                    })
                ]
            }),
            ...(!isEmpty(categories)
                ? categories.map((cat, idx) => category({category: cat, version, key: idx}))
                : [
                      div({
                          className: 'xh-changelog__version__no-category',
                          children: 'No release notes for this version.'
                      })
                  ])
        ]
    });
});

const versionTag = hoistCmp.factory<HoistProps & {text: string}>(({text}) =>
    badge({
        className: `xh-changelog__version__tag xh-changelog__version__tag--${lowerCase(text)}`,
        children: text
    })
);

const category = hoistCmp.factory<
    HoistProps & {category: ChangelogCategory; version: ChangelogVersion}
>(({category, version}) => {
    const {title, items} = category,
        style = title == null ? null : getCategoryStyle(title),
        // A title such as "🎁 New Features" brings its own emoji, so skip the icon.
        icon = EMOJI_START.test(title) ? null : (style?.icon() ?? Icon.tag());

    return div({
        className: classNames(
            'xh-changelog__version__category',
            style && `xh-changelog__version__category--${style.className}`
        ),
        children: [
            h3({
                omit: title == null,
                children: [icon, span(title)]
            }),
            ul(
                items.map((item, idx) =>
                    li({
                        key: idx,
                        children: version.isMarkdown
                            ? markdown({
                                  content: item,
                                  lineBreaks: false,
                                  reactMarkdownOptions: {components: {a: externalLink}}
                              })
                            : item
                    })
                )
            )
        ]
    });
});

const EMOJI_START = /^\p{Extended_Pictographic}/u;

// Open links in a new tab, so that following one does not unload the app.
const externalLink = ({node, ...props}) =>
    a({...props, target: '_blank', rel: 'noopener noreferrer'});

// Style for common category titles. A title matches if any of its words starts with a keyword, so
// that variants such as "Fixes" or "Technical Notes" also apply. Each style sets a CSS-safe class
// name modifier and an icon.
interface CategoryStyle {
    keywords: string[];
    className: string;
    icon: () => ReactElement;
}

const CATEGORY_STYLES: CategoryStyle[] = [
    {keywords: ['breaking'], className: 'breaking-changes', icon: () => Icon.warning()},
    {keywords: ['feature', 'new', 'added'], className: 'new-features', icon: () => Icon.gift()},
    {keywords: ['bug', 'fix'], className: 'bug-fixes', icon: () => Icon.wrench()},
    {keywords: ['technical'], className: 'technical', icon: () => Icon.gears()},
    {keywords: ['librar', 'dependenc'], className: 'libraries', icon: () => Icon.books()}
];

function getCategoryStyle(title: string): CategoryStyle {
    const titleWords = words(lowerCase(title));
    return find(CATEGORY_STYLES, ({keywords}) =>
        titleWords.some(word => keywords.some(k => word.startsWith(k)))
    );
}
