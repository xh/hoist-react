import {fileExtCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, lookup, managed, ReactionSpec} from '@xh/hoist/core';
import {FileChooserModel} from '@xh/hoist/desktop/cmp/filechooser';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import filesize from 'filesize';

export class FileDisplayModel extends HoistModel {
    @lookup(FileChooserModel)
    chooserModel: FileChooserModel;

    @managed
    gridModel: GridModel;

    override onLinked() {
        super.onLinked();
        this.addReaction(this.fileReaction());
    }

    constructor() {
        super();
        makeObservable(this);
        this.gridModel = this.createGridModel();
    }

    private createGridModel(): GridModel {
        return new GridModel({
            hideHeaders: true,
            store: {
                data: [],
                idSpec: 'name',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'size', type: 'number'}
                ]
            },
            columns: [
                {
                    colId: 'icon',
                    field: 'name',
                    ...fileExtCol
                },
                {field: 'name', flex: 1},
                {
                    field: 'size',
                    align: 'right',
                    renderer: v => filesize(v),
                    flex: 1
                },
                {
                    ...actionCol,
                    width: calcActionColWidth(1),
                    actions: [
                        {
                            icon: Icon.delete(),
                            tooltip: 'Remove file',
                            intent: 'danger',
                            actionFn: ({record}) => {
                                this.chooserModel.removeFileByName(record.data.name);
                            }
                        }
                    ]
                }
            ],
            emptyText: 'No files selected.',
            xhImpl: true
        });
    }

    private fileReaction(): ReactionSpec {
        return {
            track: () => this.chooserModel.files,
            run: files => this.gridModel.loadData(files),
            fireImmediately: true
        };
    }
}
