import { Plugin, TAbstractFile, FileExplorerView, WorkspaceLeaf, PathVirtualElement } from "obsidian";
import { around } from "monkey-around";

import FileExplorerPlusSettingTab, { FileExplorerPlusPluginSettings, ItemAction, UNSEEN_FILES_DEFAULT_SETTINGS } from "./settings";
import { addCommandsToFileMenu, addOnRename, addOnDelete, addOnTagChange, addCommands } from "./handlers";
import { checkPathFilter, checkTagFilter, changeVirtualElement } from "./utils";

export default class FileExplorerPlusPlugin extends Plugin {
    settings: FileExplorerPlusPluginSettings;

    async onload() {
        await this.loadSettings();

        addCommandsToFileMenu(this);
        addOnRename(this);
        addOnDelete(this);
        addOnTagChange(this);
        addCommands(this);

        this.addSettingTab(new FileExplorerPlusSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.patchFileExplorer();
            this.getFileExplorer()?.requestSort();
        });

        this.app.workspace.on("layout-change", () => {
            if (!this.getFileExplorer()?.fileExplorerPlusPatched) {
                this.patchFileExplorer();
                this.getFileExplorer()?.requestSort();
            }
        });
    }

    getFileExplorerContainer(): WorkspaceLeaf | undefined {
        return this.app.workspace.getLeavesOfType("file-explorer")?.first();
    }

    getFileExplorer(): FileExplorerView | undefined {
        const fileExplorerContainer = this.getFileExplorerContainer();
        return fileExplorerContainer?.view as FileExplorerView;
    }

    patchFileExplorer() {
        const fileExplorer = this.getFileExplorer();

        if (!fileExplorer) {
            throw Error("Could not find file explorer");
        }

        const plugin = this;
        const leaf = this.app.workspace.getLeaf(true);

        this.register(
            around(Object.getPrototypeOf(fileExplorer), {
                getSortedFolderItems(old: any) {
                    return function (...args: any[]) {
                        let sortedChildren: PathVirtualElement[] = old.call(this, ...args);

                        let paths = sortedChildren.map((el) => el.file);

                        if (plugin.settings.hideFilters.active) {
                            const pathsToHide = plugin.getPathsToHide(paths);

                            const pathsToHideLookUp = pathsToHide.reduce(
                                (acc, path) => {
                                    acc[path.path] = true;
                                    return acc;
                                },
                                {} as { [key: string]: boolean },
                            );

                            sortedChildren = sortedChildren.filter((vEl) => {
                                if (pathsToHideLookUp[vEl.file.path]) {
                                    vEl.info.hidden = true;
                                    return false;
                                } else {
                                    vEl.info.hidden = false;
                                    return true;
                                }
                            });
                        }

                        // only get visible vChildren
                        paths = sortedChildren.map((el) => el.file);

                        if (plugin.settings.pinFilters.active) {
                            const pathsToPin = plugin.getPathsToPin(paths);

                            const pathsToPinLookUp = pathsToPin.reduce(
                                (acc, path) => {
                                    acc[path.path] = true;
                                    return acc;
                                },
                                {} as { [key: string]: boolean },
                            );

                            const pinnedVirtualElements = sortedChildren.filter((vEl) => {
                                if (pathsToPinLookUp[vEl.file.path]) {
                                    vEl = changeVirtualElement(vEl, true, plugin.settings, ItemAction.PIN);
                                    vEl.info.pinned = true;
                                    return true;
                                } else {
                                    vEl = changeVirtualElement(vEl, false, plugin.settings, ItemAction.PIN);

                                    vEl.info.pinned = false;
                                    return false;
                                }
                            });
                            const notPinnedVirtualElements = sortedChildren.filter((vEl) => {
                                if (pathsToPinLookUp[vEl.file.path]) {
                                    return false;
                                } else {
                                    return true;
                                }
                            });

                            sortedChildren = pinnedVirtualElements.concat(notPinnedVirtualElements);
                        } else {
                            sortedChildren = sortedChildren.map((vEl) => changeVirtualElement(vEl, false, plugin.settings, ItemAction.PIN));
                        }


						if (plugin.settings.muteFilters.active) {
							const pathsToMute = plugin.getPathsToMute(paths);

							// console.log(pathsToMute);
	
							const pathsToMuteLookUp = pathsToMute.reduce(
								(acc, path) => {
									acc[path.path] = true;
									return acc;
								},
								{} as { [key: string]: boolean },
							);
	
							const mutedVirtualElements = sortedChildren.filter((vEl) => {
								if (pathsToMuteLookUp[vEl.file.path]) {
									vEl = changeVirtualElement(vEl, true, plugin.settings, ItemAction.MUTE);
									vEl.info.muted = true;
									return true;
								} else {
									vEl = changeVirtualElement(vEl, false, plugin.settings, ItemAction.MUTE);
									vEl.info.muted = false;
									return false;
								}
							});
							const notMutedVirtualElements = sortedChildren.filter((vEl) => {
								if (pathsToMuteLookUp[vEl.file.path]) {
									return false;
								} else {
									return true;
								}
							});
	
							sortedChildren = notMutedVirtualElements.concat(mutedVirtualElements);
						} else {
							sortedChildren = sortedChildren.map((vEl) => changeVirtualElement(vEl, false, plugin.settings, ItemAction.MUTE));
						}

						plugin.setFileexplorerClass(plugin.settings.hidePrefixIfIcon, 'hide-prefix-if-icon');
						plugin.setFileexplorerClass(plugin.settings.colorFolderToggle, 'color-folder-toggle');
						plugin.setFileexplorerClass(plugin.settings.moveIconsToMargin, 'move-icons-to-margin');
	
						return sortedChildren;
						
					};


					
                },
            }),
        );

        leaf.detach();

        fileExplorer.fileExplorerPlusPatched = true;
    }

    onunload() {
        const fileExplorer = this.getFileExplorer();

        if (!fileExplorer) {
            return;
        }

        for (const path in fileExplorer!.fileItems) {
            // fileExplorer!.fileItems[path] = changeVirtualElementPin(fileExplorer!.fileItems[path], false);
			fileExplorer!.fileItems[path] = changeVirtualElement(fileExplorer!.fileItems[path], false, this.settings, ItemAction.MUTE);
        }

        fileExplorer.requestSort();
        fileExplorer.fileExplorerPlusPatched = false;
    }

    async loadSettings() {
        this.settings = Object.assign({}, UNSEEN_FILES_DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

	setFileexplorerClass(val: boolean, ...classes: string[]) {
		this.removeFileexplorerClass(...classes);
		if (val) {
			this.addFileexplorerClass(...classes);
		} 
	}

	addFileexplorerClass(...classes: string[]) {
		// console.log(this.fileExplorer);
		this.getFileExplorer()?.containerEl.querySelector('div.nav-files-container')?.addClass(...classes);

	}
	removeFileexplorerClass(...classes: string[]) {
		// console.log(this.fileExplorer);		
		this.getFileExplorer()?.containerEl.querySelector('div.nav-files-container')?.removeClass(...classes);

	}

    getPathsToPin(paths: (TAbstractFile | null)[]): TAbstractFile[] {
        return paths.filter((path) => {
            if (!path) {
                return false;
            }

            const pathFilterActivated = this.settings.pinFilters.paths.some((filter) => checkPathFilter(filter, path));

            if (pathFilterActivated) {
                return true;
            }

            const tagFilterActivated = this.settings.pinFilters.tags.some((filter) => checkTagFilter(filter, path));

            if (tagFilterActivated) {
                return true;
            }

            return false;
        }) as TAbstractFile[];
    }

	getPathsToMute(paths: (TAbstractFile | null)[]): TAbstractFile[] {
        return paths.filter((path) => {
            if (!path) {
                return false;
            }

            const pathFilterActivated = this.settings.muteFilters.paths.some((filter) => checkPathFilter(filter, path));

            if (pathFilterActivated) {
                return true;
            }

            const tagFilterActivated = this.settings.muteFilters.tags.some((filter) => checkTagFilter(filter, path));

            if (tagFilterActivated) {
                return true;
            }

            return false;
        }) as TAbstractFile[];
    }

    getPathsToHide(paths: (TAbstractFile | null)[]): TAbstractFile[] {
        return paths.filter((path) => {
            if (!path) {
                return false;
            }

            const pathFilterActivated = this.settings.hideFilters.paths.some((filter) => checkPathFilter(filter, path));

            if (pathFilterActivated) {
                return true;
            }

            const tagFilterActivated = this.settings.hideFilters.tags.some((filter) => checkTagFilter(filter, path));

            if (tagFilterActivated) {
                return true;
            }

            return false;
        }) as TAbstractFile[];
    }
}
