// Mock implementation of VS Code API for testing

export const ExtensionContext = function() {
  return {
    subscriptions: [],
    workspaceState: {
      get: () => undefined,
      update: () => Promise.resolve(),
    },
    globalState: {
      get: () => undefined,
      update: () => Promise.resolve(),
    },
    extensionPath: '/mock/extension/path',
    storagePath: '/mock/storage/path',
    globalStoragePath: '/mock/global/storage/path',
  };
};

export const window = {
  showErrorMessage: () => Promise.resolve(),
  showWarningMessage: () => Promise.resolve(),
  showInformationMessage: () => Promise.resolve(),
  showInputBox: () => Promise.resolve(),
  showQuickPick: () => Promise.resolve(),
  createStatusBarItem: () => ({
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
  createOutputChannel: (name: string) => ({
    appendLine: () => {},
    append: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {},
    clear: () => {},
    name: name,
  }),
};

export const workspace = {
  getConfiguration: () => ({
    get: () => undefined,
    update: () => Promise.resolve(),
  }),
};

export const commands = {
  registerCommand: () => {},
  executeCommand: () => Promise.resolve(),
};

export const Uri = {
  parse: (str: string) => ({ toString: () => str }),
  file: (path: string) => ({ fsPath: path, toString: () => path }),
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const LanguageModelTextPart = function(text: string) {
  return { text };
};

export const LanguageModelToolResult = function(parts: any[]) {
  return { parts };
};

export const MarkdownString = function(value: string) {
  return { value };
};

export const lm = {
  registerTool: () => {},
};
