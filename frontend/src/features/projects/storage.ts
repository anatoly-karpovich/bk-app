const SELECTED_PROJECT_ID_STORAGE_KEY = "combats-dj:selected-project-id";

export function loadSelectedProjectId() {
  return localStorage.getItem(SELECTED_PROJECT_ID_STORAGE_KEY);
}

export function saveSelectedProjectId(projectId: string) {
  localStorage.setItem(SELECTED_PROJECT_ID_STORAGE_KEY, projectId);
}

export function loadSelectedGameConfigId(storageKey: string) {
  return localStorage.getItem(storageKey);
}

export function saveSelectedGameConfigId(storageKey: string, gameConfigId: string) {
  localStorage.setItem(storageKey, gameConfigId);
}
