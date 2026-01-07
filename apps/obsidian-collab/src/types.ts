export interface CollabSettings {
  collabFolder: string;
  serverUrl: string;
  autosave: boolean;
  autosaveDebounceMs: number;
  persistLocally: boolean;
}

export const DEFAULT_COLLAB_SETTINGS: CollabSettings = {
  collabFolder: "collab",
  serverUrl: "ws://127.0.0.1:1234",
  autosave: true,
  autosaveDebounceMs: 1500,
  persistLocally: true,
};
