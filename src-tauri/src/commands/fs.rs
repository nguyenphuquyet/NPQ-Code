use std::fs;
use std::io::Read;
use std::path::Path;
use std::time::UNIX_EPOCH;

use super::FileNode;

/// Sentinels the frontend matches to fall back to a preview instead of a toast.
pub const BINARY_SENTINEL: &str = "BINARY_FILE";
pub const TOO_LARGE_SENTINEL: &str = "FILE_TOO_LARGE";

const MAX_TEXT_BYTES: u64 = 8 * 1024 * 1024;
const HEAD_DEFAULT_BYTES: u64 = 512 * 1024;
const HEAD_MAX_BYTES: u64 = 4 * 1024 * 1024;

/// Folders that are never useful to browse in the tree or search in.
pub fn is_ignored(name: &str) -> bool {
    matches!(
        name,
        "node_modules"
            | ".git"
            | ".svn"
            | ".hg"
            | "target"
            | "dist"
            | "out"
            | "build"
            | "release"
            | ".next"
            | ".nuxt"
            | ".turbo"
            | ".cache"
            | ".venv"
            | "venv"
            | "__pycache__"
            | ".pytest_cache"
            | ".mypy_cache"
            | ".idea"
            | ".gradle"
            | ".angular"
            | "coverage"
            | ".DS_Store"
    )
}

fn walk(root: &Path, base: &Path) -> std::io::Result<FileNode> {
    let name = base
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| base.to_string_lossy().to_string());
    let mut node = FileNode {
        name,
        path: base.to_string_lossy().to_string(),
        is_dir: base.is_dir(),
        children: vec![],
    };
    if base.is_dir() {
        let mut entries: Vec<_> = fs::read_dir(base)?
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                !is_ignored(&name) && !e.file_type().map(|t| t.is_symlink()).unwrap_or(true)
            })
            .collect();
        entries.sort_by_key(|e| {
            let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
            (std::cmp::Reverse(is_dir), e.file_name().to_string_lossy().to_string())
        });
        for entry in entries {
            let child = entry.path();
            if let Ok(n) = walk(root, &child) {
                node.children.push(n);
            }
        }
    }
    let _ = root;
    Ok(node)
}

#[tauri::command]
pub fn list_tree(path: String) -> Result<FileNode, String> {
    walk(Path::new(&path), Path::new(&path)).map_err(|e| e.to_string())
}

fn looks_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(8192).any(|byte| *byte == 0)
}

/// Decode UTF-8 (with or without BOM) or UTF-16 with a BOM; anything else is
/// lossily decoded so legacy ANSI code pages still open instead of failing.
fn decode_text(bytes: &[u8]) -> String {
    if let Some(rest) = bytes.strip_prefix(&[0xFF, 0xFE]) {
        let units: Vec<u16> = rest
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .collect();
        return String::from_utf16_lossy(&units);
    }
    if let Some(rest) = bytes.strip_prefix(&[0xFE, 0xFF]) {
        let units: Vec<u16> = rest
            .chunks_exact(2)
            .map(|pair| u16::from_be_bytes([pair[0], pair[1]]))
            .collect();
        return String::from_utf16_lossy(&units);
    }
    let text = match String::from_utf8(bytes.to_vec()) {
        Ok(text) => text,
        Err(error) => String::from_utf8_lossy(error.as_bytes()).into_owned(),
    };
    text.trim_start_matches('\u{feff}').to_string()
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if !meta.is_file() {
        return Err("Not a file".into());
    }
    if meta.len() > MAX_TEXT_BYTES {
        return Err(format!("{TOO_LARGE_SENTINEL}:{}", meta.len()));
    }
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    let utf16 = bytes.starts_with(&[0xFF, 0xFE]) || bytes.starts_with(&[0xFE, 0xFF]);
    if !utf16 && looks_binary(&bytes) {
        return Err(BINARY_SENTINEL.into());
    }
    Ok(decode_text(&bytes))
}

/// Lossy read of the first `limit` bytes, used to preview binaries or files
/// above the editor size limit as text.
#[tauri::command]
pub fn read_file_head(path: String, limit: Option<u64>) -> Result<String, String> {
    let cap = limit.unwrap_or(HEAD_DEFAULT_BYTES).clamp(1, HEAD_MAX_BYTES) as usize;
    let mut file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut buffer = vec![0u8; cap];
    let read = file.read(&mut buffer).map_err(|e| e.to_string())?;
    buffer.truncate(read);
    Ok(String::from_utf8_lossy(&buffer).into_owned())
}

#[derive(serde::Serialize)]
pub struct FileMeta {
    pub size: u64,
    pub modified: Option<u64>,
    pub is_dir: bool,
}

#[tauri::command]
pub fn file_meta(path: String) -> Result<FileMeta, String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    let modified = meta
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64);
    Ok(FileMeta {
        size: meta.len(),
        modified,
        is_dir: meta.is_dir(),
    })
}

/// Hand a file to the OS so images, videos, archives and documents open in
/// their default application.
#[tauri::command]
pub fn open_external(path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err("File no longer exists".into());
    }
    #[cfg(target_os = "windows")]
    let mut command = std::process::Command::new("explorer");
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = std::process::Command::new("xdg-open");
    command.arg(&path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

/// Show the file selected in the system file manager.
#[tauri::command]
pub fn reveal_path(path: String) -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    let target = Path::new(&path);
    #[cfg(target_os = "windows")]
    {
        let mut command = std::process::Command::new("explorer");
        if target.is_file() {
            command.arg(format!("/select,{path}"));
        } else {
            command.arg(&path);
        }
        command.spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let directory = if target.is_file() {
            target.parent().unwrap_or(target)
        } else {
            target
        };
        std::process::Command::new("xdg-open")
            .arg(directory)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    if Path::new(&path).exists() {
        return Err("A file with that name already exists".into());
    }
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, "").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    if Path::new(&new_path).exists() {
        return Err("Destination already exists".into());
    }
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}
