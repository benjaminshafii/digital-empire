export class Plugin {
  app: any;
  constructor() {
    this.app = {};
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onload(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onunload(): void {}
  registerView(): void {}
  addSettingTab(): void {}
  addCommand(): void {}
  registerEvent(): void {}
  async loadData(): Promise<any> {
    return {};
  }
  async saveData(): Promise<void> {}
}

export class Notice {
  constructor(_message: string) {}
}

export class ItemView {
  containerEl: any;
  app: any;
  constructor(_leaf: any) {
    this.containerEl = { children: [{}, { empty: () => {}, addClass: () => {}, createEl: () => {}, createDiv: () => ({ style: {} }) }] };
    this.app = { vault: { getAbstractFileByPath: () => null, read: async () => "", modify: async () => {} } };
  }
}

export class PluginSettingTab {
  containerEl: any;
  app: any;
  plugin: any;
  constructor(app: any, plugin: any) {
    this.containerEl = { empty: () => {}, createEl: () => {} };
    this.app = app;
    this.plugin = plugin;
  }
  display(): void {}
}

export class Setting {
  constructor(_el: any) {}
  setName(): this {
    return this;
  }
  setDesc(): this {
    return this;
  }
  addText(cb: (text: any) => void): this {
    cb({ setPlaceholder: () => ({ setValue: () => ({ onChange: async () => {} }) }) });
    return this;
  }
  addToggle(cb: (toggle: any) => void): this {
    cb({ setValue: () => ({ onChange: async () => {} }) });
    return this;
  }
  addButton(cb: (button: any) => void): this {
    cb({ setButtonText: () => ({ onClick: async () => {} }) });
    return this;
  }
}

export class TFile {
  path: string;
  extension: string;
  basename: string;
  constructor(path: string) {
    this.path = path;
    this.extension = "md";
    this.basename = path.split("/").pop() ?? "";
  }
}

export class WorkspaceLeaf {}

export class App {}
