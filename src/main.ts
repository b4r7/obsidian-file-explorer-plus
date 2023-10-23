import { Plugin, TAbstractFile, TFolder, Vault, FileExplorerView, PathVirtualElement } from "obsidian";
import { around } from "monkey-around";

import FileExplorerPlusSettingTab, { FileExplorerPlusPluginSettings, ItemAction, UNSEEN_FILES_DEFAULT_SETTINGS } from "./settings";
import { addCommandsToFileMenu, addOnRename, addOnDelete, addOnTagChange, addCommands } from "./handlers";
import { checkPathFilter, checkTagFilter, changeVirtualElement } from "./utils";

export default class FileExplorerPlusPlugin extends Plugin {
    settings: FileExplorerPlusPluginSettings;
    fileExplorer?: FileExplorerView | null;

    async onload() {
        await this.loadSettings();

        addCommandsToFileMenu(this);
        addOnRename(this);
        addOnDelete(this);
        addOnTagChange(this);
        addCommands(this);

        this.addSettingTab(new FileExplorerPlusSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.patchFileExplorerFolder();
            this.fileExplorer!.requestSort();
        });
    }

    getFileExplorer(): FileExplorerView | undefined {
        return this.app.workspace.getLeavesOfType("file-explorer")?.first()?.view as FileExplorerView;
    }

    patchFileExplorerFolder() {
        this.fileExplorer = this.getFileExplorer();

        if (!this.fileExplorer) {
            throw Error("Could not find file explorer");
        }

        const plugin = this;
        const leaf = this.app.workspace.getLeaf(true);

        //@ts-expect-error
        const tmpFolder = new TFolder(Vault, "");
        const Folder = this.fileExplorer!.createFolderDom(tmpFolder).constructor;

        this.register(
            around(Folder.prototype, {
                sort(old: any) {
                    return function (...args: any[]) {
                        old.call(this, ...args);

						
                        if (!this.hiddenVChildren) {
                            this.hiddenVChildren = [];
                        }

                        // after old.call vChildren is repopulated, but hiddenVChildren is kept
                        let virtualElements: PathVirtualElement[] = this.vChildren.children;
                        let paths = virtualElements.map((el) => el.file);

						

                        if (plugin.settings.hideFilters.active) {
							
                            const pathsToHide = plugin.getPathsToHide(paths);

                            const pathsToHideLookUp = pathsToHide.reduce(
                                (acc, path) => {
                                    acc[path.path] = true;
                                    return acc;
                                },
                                {} as { [key: string]: boolean },
                            );

                            const hiddenVChildren = [];
                            const visibleVChildren = [];

                            for (const vEl of virtualElements) {
                                if (pathsToHideLookUp[vEl.file.path]) {
                                    vEl.info.hidden = true;
                                    hiddenVChildren.push(vEl);
                                } else {
                                    vEl.info.hidden = false;
                                    visibleVChildren.push(vEl);
                                }
                            }

                            this.hiddenVChildren = hiddenVChildren;
                            this.vChildren.setChildren(visibleVChildren);
                        }

                        // only get visible vChildren
                        virtualElements = this.vChildren.children;
						paths = virtualElements.map((el) => el.file);

						//Apply pinned filters
                        if (plugin.settings.pinFilters.active) {
							
                            const pathsToPin = plugin.getPathsToPin(paths);
							
													

                            const pathsToPinLookUp = pathsToPin.reduce(
                                (acc, path) => {
                                    acc[path.path] = true;
                                    return acc;
                                },
                                {} as { [key: string]: boolean },
                            );

							// console.log('pathsToPinLookUp', pathsToPinLookUp);

                            const pinnedVirtualElements = [];
                            const notPinnedVirtualElements = [];

							// console.log('pathsToPin', pathsToPin);

                            for (let vEl of virtualElements) {
									

                                if (pathsToPinLookUp[vEl.file.path]) {
									
                                    vEl = changeVirtualElement(vEl, true, plugin.settings, ItemAction.PIN);
                                    vEl.info.pinned = true;
                                    pinnedVirtualElements.push(vEl);
                                } else {
                                    vEl = changeVirtualElement(vEl, false, plugin.settings, ItemAction.PIN);
                                    vEl.info.pinned = false;
                                    notPinnedVirtualElements.push(vEl);
                                }
                            }

                            virtualElements = pinnedVirtualElements.concat(notPinnedVirtualElements);
                        } else {
                            virtualElements = virtualElements.map((vEl) => changeVirtualElement(vEl, false, this, ItemAction.PIN));
                        }

						// Apply mute filters
						if (plugin.settings.muteFilters.active) {
                            const pathsToMute = plugin.getPathsToMute(paths);

                            const pathsToMuteLookUp = pathsToMute.reduce(
                                (acc, path) => {
                                    acc[path.path] = true;
                                    return acc;
                                },
                                {} as { [key: string]: boolean },
                            );

                            const mutedVirtualElements = [];
                            const notMutedVirtualElements = [];

                            for (let vEl of virtualElements) {
                                if (pathsToMuteLookUp[vEl.file.path]) {
                                    vEl = changeVirtualElement(vEl, true, plugin.settings, ItemAction.MUTE);
                                    vEl.info.muted = true;
                                    mutedVirtualElements.push(vEl);
                                } else {
									vEl = changeVirtualElement(vEl, false, plugin.settings, ItemAction.MUTE);
                                    vEl.info.muted = false;
                                    notMutedVirtualElements.push(vEl);
                                }
                            }

                            virtualElements = notMutedVirtualElements.concat(mutedVirtualElements);
                        } else {
                            virtualElements = virtualElements.map((vEl) => changeVirtualElement(vEl, false, plugin.settings, ItemAction.MUTE));
                        }

						plugin.setFileexplorerClass(plugin.settings.hidePrefixIfIcon, 'hide-prefix-if-icon');
						plugin.setFileexplorerClass(plugin.settings.colorFolderToggle, 'color-folder-toggle');
						

                        this.vChildren.setChildren(virtualElements);
                    };
                },
            }),
        );
        leaf.detach();
    }

    onunload() {
        for (const path in this.fileExplorer!.fileItems) {
            this.fileExplorer!.fileItems[path] = changeVirtualElement(this.fileExplorer!.fileItems[path], false, this.settings, ItemAction.MUTE); //changeVirtualElementPin(this.fileExplorer!.fileItems[path], false);
        }

        this.fileExplorer!.requestSort();
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
		console.log(this.fileExplorer);
		// this.fileExplorer?.containerEl.addClass(...classes);
		this.fileExplorer?.containerEl.querySelector('div.nav-files-container')?.addClass(...classes);

	}
	removeFileexplorerClass(...classes: string[]) {
		console.log(this.fileExplorer);
		// this.fileExplorer?.containerEl.addClass(...classes);
		this.fileExplorer?.containerEl.querySelector('div.nav-files-container')?.removeClass(...classes);

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
