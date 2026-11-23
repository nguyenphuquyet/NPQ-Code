use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager};

use super::{RecentWorkspace, WorkspaceInfo};

fn recent_file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|p| p.join("recent.json"))
}

fn read_recent(app: &AppHandle) -> Vec<RecentWorkspace> {
    let Some(path) = recent_file(app) else { return vec![] };
    let Ok(bytes) = fs::read(&path) else { return vec![] };
    serde_json::from_slice(&bytes).unwrap_or_default()
}

fn write_recent(app: &AppHandle, list: &[RecentWorkspace]) {
    let Some(path) = recent_file(app) else { return };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(bytes) = serde_json::to_vec_pretty(list) {
        let _ = fs::write(&path, bytes);
    }
}

fn add_recent(app: &AppHandle, path: &str, name: &str) {
    let mut list = read_recent(app);
    list.retain(|p| p.path != path);
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    list.insert(
        0,
        RecentWorkspace {
            path: path.into(),
            name: name.into(),
            opened_at: now,
        },
    );
    list.truncate(15);
    write_recent(app, &list);
}

/// Opens a folder as the workspace. Any directory is valid — no project
/// metadata is required.
#[tauri::command]
pub fn open_workspace(app: AppHandle, path: String) -> Result<WorkspaceInfo, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("Not a folder: {path}"));
    }
    let canonical = fs::canonicalize(dir).unwrap_or_else(|_| dir.to_path_buf());
    let path_str = canonical.to_string_lossy().to_string();
    let name = canonical
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| path_str.clone());
    add_recent(&app, &path_str, &name);
    Ok(WorkspaceInfo {
        path: path_str,
        name,
    })
}

#[tauri::command]
pub fn recent_workspaces(app: AppHandle) -> Vec<RecentWorkspace> {
    read_recent(&app)
        .into_iter()
        .filter(|r| Path::new(&r.path).is_dir())
        .collect()
}

#[tauri::command]
pub fn remove_recent(app: AppHandle, path: String) {
    let mut list = read_recent(&app);
    list.retain(|p| p.path != path);
    write_recent(&app, &list);
}
