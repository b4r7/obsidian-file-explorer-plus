import { App, PluginSettingTab, Setting } from "obsidian";

import { PathSuggest } from "./ui/suggest";

import FileExplorerPlusPlugin from "./main";
import { PathsActivatedModal } from "./ui/modals";


export enum ItemAction {
	PIN = "PIN",
	MUTE = "MUTE",
	HIDE = "HIDE"
}

export interface TagFilter {
    name: string;
    active: boolean;
    pattern: string;
    patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export interface PathFilter {
    name: string;
    active: boolean;
    type: "FILES" | "DIRECTORIES" | "FILES_AND_DIRECTORIES";
    pattern: string;
    patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export interface FileExplorerPlusPluginSettings {
    hideStrictPathFilters: boolean;
	useCustomPinChar: boolean;
	customPinChar: string;
	useCustomMuteChar: boolean;
	customMuteChar: string;

    pinFilters: {
        active: boolean;
        tags: TagFilter[];
        paths: PathFilter[];
    };

	muteFilters: {
        active: boolean;
        tags: TagFilter[];
        paths: PathFilter[];
    };

    hideFilters: {
        active: boolean;
        tags: TagFilter[];
        paths: PathFilter[];
    };
}

export interface Filter {
    name: string;
    active: boolean;
    pattern: string;
    patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export const UNSEEN_FILES_DEFAULT_SETTINGS: FileExplorerPlusPluginSettings = {
    hideStrictPathFilters: true,
	useCustomPinChar: false,
	customPinChar: '•',
	useCustomMuteChar: false,
	customMuteChar: '◦',
    pinFilters: {
        active: true,
        tags: [
            {
                name: "",
                active: true,
                pattern: "",
                patternType: "STRICT",
            },
        ],
        paths: [
            {
                name: "",
                active: true,
                type: "FILES_AND_DIRECTORIES",
                pattern: "",
                patternType: "WILDCARD",
            },
        ],
    },
	muteFilters: {
        active: true,
        tags: [
            {
                name: "",
                active: true,
                pattern: "",
                patternType: "STRICT",
            },
        ],
        paths: [
            {
                name: "",
                active: true,
                type: "FILES_AND_DIRECTORIES",
                pattern: "",
                patternType: "WILDCARD",
            },
        ],
    },
    hideFilters: {
        active: true,
        tags: [
            {
                name: "",
                active: true,
                pattern: "",
                patternType: "STRICT",
            },
        ],
        paths: [
            {
                name: "",
                active: true,
                type: "FILES_AND_DIRECTORIES",
                pattern: "",
                patternType: "WILDCARD",
            },
        ],
    },
};

export default class FileExplorerPlusSettingTab extends PluginSettingTab {
    constructor(
        app: App,
        private plugin: FileExplorerPlusPlugin,
    ) {
        super(app, plugin);
    }

    display(): void {
        this.cleanSettings();

        this.containerEl.empty();
        this.containerEl.addClass("file-explorer-plus");

        

        this.containerEl.createEl("h2", { text: "Pinning", attr: { class: "settings-header" } });
        new Setting(this.containerEl)
            .setName("Enable pinning")
            // .setDesc("Toggle whether or not pin filters for paths and folders should be active.")
            .addToggle((toggle) => {
                toggle
                    .setTooltip("Active")
                    .setValue(this.plugin.settings.pinFilters.active)
                    .onChange((isActive) => {
                        this.plugin.settings.pinFilters.active = isActive;

                        this.plugin.saveSettings();
                        this.plugin.fileExplorer!.requestSort();
                    });
            });
		new Setting(this.containerEl)
            .setName("Prefix pinned items")            
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.useCustomPinChar)
                    .onChange((isActive) => {
						
                        this.plugin.settings.useCustomPinChar = isActive;
						
                        this.plugin.saveSettings();
						this.display();
                        this.plugin.fileExplorer!.requestSort();
                    });
            });

		if (this.plugin.settings.useCustomPinChar){
			new Setting(this.containerEl)
			.setName("Prefix")
			.setDesc("Can be one or more character, emoji, or even html")
			.addText((text) => {
				text.setPlaceholder("")
					.setValue(this.plugin.settings.customPinChar)
					.onChange((value) => {
						this.plugin.settings.customPinChar = value;

						this.plugin.saveSettings();
						this.plugin.fileExplorer!.requestSort();

					})
			
					
			})
			.addExtraButton((button) => {
				button
					.setIcon("undo-2")
					.setTooltip("Revert to default")
					.onClick(() => {
						this.plugin.settings.customPinChar = UNSEEN_FILES_DEFAULT_SETTINGS.customPinChar;

						this.plugin.saveSettings();
						this.display();
						this.plugin.fileExplorer!.requestSort();
					});
			});
		}
		

        

		this.containerEl.createEl("h2", { text: "Muting", attr: { class: "settings-header" } });
		this.containerEl.createEl("p", { text: "Muted items get sorted to the bottom of folder they're in, and are lowered in opacity." });
			new Setting(this.containerEl)
				.setName("Enable muting")				
				.addToggle((toggle) => {
					toggle
						.setTooltip("Active")
						.setValue(this.plugin.settings.muteFilters.active)
						.onChange((isActive) => {
							this.plugin.settings.muteFilters.active = isActive;
	
							this.plugin.saveSettings();
							this.plugin.fileExplorer!.requestSort();
						});
				});
			new Setting(this.containerEl)
				.setName("Prefix muted items")				
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.useCustomMuteChar)
						.onChange((isActive) => {
							
							this.plugin.settings.useCustomMuteChar = isActive;
							
							this.plugin.saveSettings();
							this.display();
							this.plugin.fileExplorer!.requestSort();
						});
				});
			if (this.plugin.settings.useCustomMuteChar)	{
			new Setting(this.containerEl)
				.setName("Prefix")
				.setDesc("Can be one or more character, emoji, or even html")
				.addText((text) => {
					text.setPlaceholder("")
						.setValue(this.plugin.settings.customMuteChar)
						.onChange((value) => {
							this.plugin.settings.customMuteChar = value;
	
							this.plugin.saveSettings();
							this.plugin.fileExplorer!.requestSort();
	
						});
				})
			}

        this.containerEl.createEl("h2", { text: "Hiding", attr: { class: "settings-header" } });
        this.containerEl.createEl("p", { text: "Hide items entirely. You can use a plugin like commander to toggle this to the explorer menu" });
        new Setting(this.containerEl)
            .setName("Enable hidden items")
            .addToggle((toggle) => {
                toggle
                    .setTooltip("Active")
                    .setValue(this.plugin.settings.hideFilters.active)
                    .onChange((isActive) => {
                        this.plugin.settings.hideFilters.active = isActive;

                        this.plugin.saveSettings();

                        this.plugin.fileExplorer!.requestSort();
                    });
            });

        
		this.containerEl.createEl("h2", { text: "Automatic filters", attr: { class: "settings-header" } });
		new Setting(this.containerEl)
            .setName("Hide manually added pinned/muted/hidden items from filter list")
            .setDesc(
                "Hide path filters with type strict from both the pin and hide filter tables below. Good for decluttering the filter tables. These are created when pinning or hiding a file straight in the file explorer.",
            )
            .addToggle((toggle) => {
                toggle
                    .setTooltip("Active")
                    .setValue(this.plugin.settings.hideStrictPathFilters)
                    .onChange((isActive) => {
                        this.plugin.settings.hideStrictPathFilters = isActive;

                        this.plugin.saveSettings();

                        this.display();
                    });
            });


        this.containerEl.createEl("h3", { text: "Pin filters"});
		new Setting(this.containerEl)
            .setName("View paths pinned by filters")
            .setDesc("View paths that are currently being pinned by the active filters below.")
            .addButton((button) => {
                button.setButtonText("View").onClick(() => {
                    new PathsActivatedModal(this.plugin, "PIN").open();
                });
            });

        
		this.tagFiltersSettings(this.plugin.settings.pinFilters, "PIN");
		this.pathFiltersSettings(this.plugin.settings.pinFilters, "PIN");

        // this.pinPathFiltersSettings();
		
        this.containerEl.createEl("h3", { text: "Mute filters"});
		new Setting(this.containerEl)
            .setName("View paths muted by filters")
            .setDesc("View paths that are currently being muted by the active filters below.")
            .addButton((button) => {
                button.setButtonText("View").onClick(() => {
                    new PathsActivatedModal(this.plugin, "MUTE").open();
                });
            });
		this.tagFiltersSettings(this.plugin.settings.muteFilters, "MUTE");
		this.pathFiltersSettings(this.plugin.settings.muteFilters, "MUTE");

		// this.muteTagFiltersSettings();
        // this.pinPathFiltersSettings();

        this.containerEl.createEl("h3", { text: "Hide filters"});	
		new Setting(this.containerEl)
            .setName("View paths hidden by filters")
            .setDesc("View paths that are currently being hidden by the active filters below.")
            .addButton((button) => {
                button.setButtonText("View").onClick(() => {
                    new PathsActivatedModal(this.plugin, "HIDE").open();
                });
            });	
			this.tagFiltersSettings(this.plugin.settings.hideFilters, "HIDE");
			this.pathFiltersSettings(this.plugin.settings.hideFilters, "HIDE");
        // this.hideTagFiltersSettings();
        // this.hidePathFiltersSettings();
    }

    cleanSettings() {
        this.plugin.settings.hideFilters.tags = this.plugin.settings.hideFilters.tags.filter((filter, index, arr) => {
            if (index == arr.length - 1) {
                return true;
            }

            return filter.pattern !== "" && arr.findIndex((x) => x.pattern === filter.pattern) === index;
        });

        this.plugin.settings.hideFilters.paths = this.plugin.settings.hideFilters.paths.filter((filter, index, arr) => {
            if (index == arr.length - 1) {
                return true;
            }

            return filter.pattern !== "" && arr.findIndex((x) => x.pattern === filter.pattern) === index;
        });
    }

    
	tagFiltersSettings(filters:FileExplorerPlusPluginSettings["muteFilters"], actionType: PathsActivatedModal["actionType"]) {
        this.containerEl.createEl("h2", { text: "Tag filters" });

        filters.tags.forEach((filter, index) => {
            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            filters.tags[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addText((text) => {
                    text.setPlaceholder("Tag pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            filters.tags[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            filters.tags[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            filters.tags[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths pinned by this filter")
                        .onClick(() => {
							//console.log(filters);
                            new PathsActivatedModal(this.plugin, actionType, filter, "TAG").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            filters.tags.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.fileExplorer!.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add")
                .setCta()
                .onClick(() => {
					
					try{
                    filters.tags.push({
                        name: "",
                        active: true,
                        pattern: "",
                        patternType: "STRICT",
                    });
				} catch(error) {
					console.log(error);
				}
					
					console.log(this.plugin.settings);

                    this.plugin.saveSettings();
					

                    this.display();
                });
        });
    }


	
    pathFiltersSettings(filters:FileExplorerPlusPluginSettings["muteFilters"], actionType: PathsActivatedModal["actionType"]) {
        this.containerEl.createEl("h2", { text: "Path filters" });

        filters.paths.forEach((filter, index) => {
            if (this.plugin.settings.hideStrictPathFilters && filter.patternType === "STRICT") {
                return;
            }

            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            filters.paths[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addSearch((text) => {
                    new PathSuggest(this.app, text.inputEl);

                    text.setPlaceholder("Path pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            filters.paths[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            FILES_AND_DIRECTORIES: "Files and folders",
                            FILES: "Files",
                            DIRECTORIES: "Folders",
                        })
                        .setValue(filter.type)
                        .onChange((newType) => {
                            filters.paths[index].type = newType as PathFilter["type"];

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            filters.paths[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            filters.paths[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths pinned by this filter")
                        .onClick(() => {
                            new PathsActivatedModal(this.plugin, actionType, filter, "PATH").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            filters.paths.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.fileExplorer!.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add")
                .setCta()
                .onClick(() => {
                    filters.paths.push({
                        name: "",
                        active: true,
                        type: "FILES_AND_DIRECTORIES",
                        pattern: "",
                        patternType: "WILDCARD",
                    });
                    this.plugin.saveSettings();
                    this.display();
                });
        });
    }
}
