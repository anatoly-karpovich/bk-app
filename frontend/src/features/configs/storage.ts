const SELECTED_CONFIG_ID_STORAGE_KEY = "combats-dj:selected-config-id";

export function loadSelectedConfigId() {
  return localStorage.getItem(SELECTED_CONFIG_ID_STORAGE_KEY);
}

export function saveSelectedConfigId(configId: string) {
  localStorage.setItem(SELECTED_CONFIG_ID_STORAGE_KEY, configId);
}
