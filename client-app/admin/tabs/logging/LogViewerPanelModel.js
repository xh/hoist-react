/**
 * Model for the LogViewerPanel, representing its layout, and currently selected Tab.
 */
import {XH} from 'hoist';
import {observable, autorun, action} from 'hoist/mobx';
import {hbox, div} from 'hoist/layout';

export class LogViewerPanelModel {
    @observable collapsed = false;
    @observable tail = true;
    @observable file = null;
    @observable startLine = 1;
    @observable maxLines = 1000;
    @observable pattern = '';
    @observable fileContent = [];

    loadLines = autorun(() => {
        if (!this.file) return;

        return XH
            .fetchJson({
                url: 'logViewerAdmin/getFile',
                params: {
                    filename: this.file,
                    startLine: this.startLine,
                    maxLines: this.maxLines,
                    pattern: this.pattern
                }
            }).then(this.updateFileContent).catch(e => {
                XH.handleException(e);
            });
    });

    @action
    loadFile = (ctx) => {
        const data = ctx.data;

        this.file = data.filename;
    };

    @action
    updateFileContent = (rows) => {
        this.fileContent = rows.content.map(row => hbox({
            cls: 'line',
            items: [
                div({
                    cls: 'row-number',
                    items: row[0].toString()
                }),
                div({
                    cls: 'row-content',
                    items: row[1]
                })
            ]
        }));
    };

    @action
    toggleLogPanel = () => {
        this.collapsed = !this.collapsed;
    }
}