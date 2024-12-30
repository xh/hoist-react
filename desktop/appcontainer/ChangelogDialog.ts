/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ChangelogDialogModel} from '@xh/hoist/appcontainer/ChangelogDialogModel';
import {div, filler, h2, h3, li, ul} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {lowerCase, isEmpty} from 'lodash';
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
            item: changelogContents(),
            onClose: () => model.hide()
        });
    }
});

const changelogContents = hoistCmp.factory<ChangelogDialogModel>(({model}) => {
    const {versions} = XH.changelogService;
    return panel({
        item: div({
            className: 'xh-changelog__inner',
            items: versions.map(it => version({version: it}))
        }),
        bbar: [
            filler(),
            button({
                text: 'Close',
                intent: 'primary',
                onClick: () => model.hide()
            })
        ]
    });
});

const version = hoistCmp.factory(({version}) => {
    const categories = !isEmpty(version.categories)
        ? version.categories.map(cat => {
              const catClassName = categoryClassNames[lowerCase(cat.title)] ?? '';
              return div({
                  className: `xh-changelog__version__category ${
                      catClassName ? 'xh-changelog__version__category--' + catClassName : ''
                  }`,
                  items: [h3(cat.title), ul(cat.items.map(item => li(item)))]
              });
          })
        : [
              div({
                  className: 'xh-changelog__version__no-category',
                  item: h3('No release notes for this version.')
              })
          ];

    return div({
        className: `xh-changelog__version ${
            version.isCurrentVersion ? 'xh-changelog__version--current' : ''
        }`,
        items: [h2(version.title), ...categories]
    });
});

// CSS-safe classnames for expected/common category titles.
const categoryClassNames = {
    'breaking changes': 'breaking-changes',
    'new features': 'new-features',
    'bug fixes': 'bug-fixes',
    technical: 'technical',
    libraries: 'libraries'
};
