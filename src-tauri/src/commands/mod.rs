pub mod fs;
pub mod git;
pub mod project;
pub mod search;
pub mod terminal;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
}

#[derive(Serialize, Clone)]
pub struct WorkspaceInfo {
    pub path: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RecentWorkspace {
    pub path: String,
    pub name: String,
    pub opened_at: i64,
}
