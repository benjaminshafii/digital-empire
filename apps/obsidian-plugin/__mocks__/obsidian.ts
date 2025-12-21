/**
 * Mock obsidian module for testing
 * Only includes the parts we actually use in our code
 */

export class TFile {
  path: string;
  basename: string;
  name: string;
  extension: string;

  constructor(path: string = "") {
    this.path = path;
    this.name = path.split("/").pop() || "";
    this.basename = this.name.replace(/\.[^.]+$/, "");
    this.extension = this.name.split(".").pop() || "";
  }
}

export class TFolder {
  path: string;
  name: string;

  constructor(path: string = "") {
    this.path = path;
    this.name = path.split("/").pop() || "";
  }
}

export type App = {
  vault: {
    getMarkdownFiles: () => TFile[];
    read: (file: TFile) => Promise<string>;
    readBinary: (file: TFile) => Promise<ArrayBuffer>;
    getAbstractFileByPath: (path: string) => TFile | TFolder | null;
  };
  metadataCache: {
    getFirstLinkpathDest: (linkpath: string, sourcePath: string) => TFile | null;
  };
};

export class ItemView {
  containerEl: HTMLElement;
  app: App;
  leaf: any;

  constructor(leaf: any) {
    this.leaf = leaf;
    this.containerEl = document.createElement("div");
  }

  getViewType(): string {
    return "";
  }

  getDisplayText(): string {
    return "";
  }

  getIcon(): string {
    return "";
  }

  async onOpen(): Promise<void> {}
  async onClose(): Promise<void> {}
}

export class WorkspaceLeaf {}

export class Plugin {
  app: App;
  manifest: any;

  constructor(app: App, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData(): Promise<any> {
    return {};
  }

  async saveData(data: any): Promise<void> {}

  addRibbonIcon(icon: string, title: string, callback: () => void): HTMLElement {
    return document.createElement("div");
  }

  addStatusBarItem(): HTMLElement {
    return document.createElement("div");
  }

  addCommand(command: any): void {}

  registerView(type: string, viewCreator: any): void {}
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement("div");
  }

  display(): void {}
  hide(): void {}
}

export class Setting {
  settingEl: HTMLElement;
  infoEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.infoEl = document.createElement("div");
    this.nameEl = document.createElement("div");
    this.descEl = document.createElement("div");
    this.controlEl = document.createElement("div");
  }

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  addText(callback: (text: any) => void): this {
    callback({
      setPlaceholder: () => ({ setValue: () => ({ onChange: () => {} }) }),
      setValue: () => ({ onChange: () => {} }),
      onChange: () => {},
    });
    return this;
  }

  addToggle(callback: (toggle: any) => void): this {
    callback({
      setValue: () => ({ onChange: () => {} }),
      onChange: () => {},
    });
    return this;
  }

  addButton(callback: (button: any) => void): this {
    callback({
      setButtonText: () => ({ onClick: () => {} }),
      onClick: () => {},
      setCta: () => ({}),
    });
    return this;
  }
}

export function setIcon(el: HTMLElement, icon: string): void {}

export class Notice {
  constructor(message: string, timeout?: number) {}
}
