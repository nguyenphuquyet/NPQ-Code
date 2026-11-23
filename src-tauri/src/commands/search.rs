use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use super::fs::is_ignored;

#[derive(Serialize, Clone)]
pub struct SearchHit {
    pub line: u32,
    pub column: u32,
    pub content: String,
}

#[derive(Serialize, Clone)]
pub struct SearchFile {
    pub path: String,
    pub name: String,
    pub hits: Vec<SearchHit>,
}

const MAX_FILE_BYTES: u64 = 1024 * 1024;
const MAX_FILES: usize = 5000;
const MAX_HITS: usize = 1200;
const MAX_HITS_PER_FILE: usize = 40;
const MAX_LINE_CHARS: usize = 300;

fn collect_files(dir: &Path, files: &mut Vec<PathBuf>, budget: &mut usize) {
    if *budget == 0 {
        return;
    }
    let Ok(read) = fs::read_dir(dir) else { return };
    for entry in read.filter_map(Result::ok) {
        if *budget == 0 {
            return;
        }
        let Ok(file_type) = entry.file_type() else { continue };
        if file_type.is_symlink() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if file_type.is_dir() {
            if !is_ignored(&name) {
                collect_files(&entry.path(), files, budget);
            }
        } else if file_type.is_file() {
            *budget -= 1;
            files.push(entry.path());
        }
    }
}

/// Character-index search so the returned column is what CodeMirror expects.
fn find_char_index(haystack: &[char], needle: &[char], case_sensitive: bool) -> Option<usize> {
    if needle.is_empty() || needle.len() > haystack.len() {
        return None;
    }
    let last = haystack.len() - needle.len();
    for start in 0..=last {
        let matched = needle.iter().enumerate().all(|(offset, needle_ch)| {
            let hay = haystack[start + offset];
            if case_sensitive {
                hay == *needle_ch
            } else {
                hay.to_lowercase().eq(needle_ch.to_lowercase())
            }
        });
        if matched {
            return Some(start);
        }
    }
    None
}

fn search_file(path: &Path, needle: &[char], case_sensitive: bool) -> Vec<SearchHit> {
    let Ok(meta) = fs::metadata(path) else { return vec![] };
    if meta.len() == 0 || meta.len() > MAX_FILE_BYTES {
        return vec![];
    }
    let Ok(bytes) = fs::read(path) else { return vec![] };
    let Ok(text) = String::from_utf8(bytes) else { return vec![] };
    if text.contains('\0') {
        return vec![];
    }

    let mut hits = Vec::new();
    for (index, line) in text.lines().enumerate() {
        if hits.len() >= MAX_HITS_PER_FILE {
            break;
        }
        let chars: Vec<char> = line.chars().collect();
        if let Some(column) = find_char_index(&chars, needle, case_sensitive) {
            let content: String = chars.iter().take(MAX_LINE_CHARS).collect();
            hits.push(SearchHit {
                line: index as u32 + 1,
                column: column as u32 + 1,
                content: content.trim_end().to_string(),
            });
        }
    }
    hits
}

fn run_search(root: &Path, query: &str, case_sensitive: bool) -> Result<Vec<SearchFile>, String> {
    if !root.is_dir() {
        return Err("Workspace folder no longer exists".into());
    }
    let needle: Vec<char> = query.chars().collect();
    let mut budget = MAX_FILES;
    let mut files = Vec::new();
    collect_files(root, &mut files, &mut budget);
    files.sort();

    let mut results = Vec::new();
    let mut total_hits = 0usize;
    for file in files {
        if total_hits >= MAX_HITS {
            break;
        }
        let hits = search_file(&file, &needle, case_sensitive);
        if hits.is_empty() {
            continue;
        }
        total_hits += hits.len();
        let name = file
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        results.push(SearchFile {
            path: file.to_string_lossy().to_string(),
            name,
            hits,
        });
        if results.len() >= 200 {
            break;
        }
    }
    Ok(results)
}

#[tauri::command]
pub async fn search_workspace(
    root: String,
    query: String,
    case_sensitive: bool,
) -> Result<Vec<SearchFile>, String> {
    let query = query.to_string();
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    tauri::async_runtime::spawn_blocking(move || {
        run_search(Path::new(&root), &query, case_sensitive)
    })
    .await
    .map_err(|e| e.to_string())?
}
