use serde::Serialize;
use std::fs;
use std::path::Path;
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Sentinel returned when the `git` binary cannot be spawned. The UI turns this
/// into a localized "Git is not installed" message instead of a raw OS error.
const NOT_FOUND: &str = "GIT_NOT_FOUND";

#[derive(Serialize, Clone)]
pub struct GitFile {
    /// Path relative to the repository root, with forward slashes.
    pub path: String,
    pub orig_path: Option<String>,
    /// modified | added | deleted | renamed | copied | conflicted | untracked
    pub status: String,
    pub staged: bool,
}

#[derive(Serialize, Clone)]
pub struct GitStatus {
    pub is_repo: bool,
    pub repo_root: Option<String>,
    pub branch: Option<String>,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub staged: Vec<GitFile>,
    pub changes: Vec<GitFile>,
    pub untracked: Vec<GitFile>,
}

impl GitStatus {
    fn not_repo() -> Self {
        GitStatus {
            is_repo: false,
            repo_root: None,
            branch: None,
            upstream: None,
            ahead: 0,
            behind: 0,
            staged: Vec::new(),
            changes: Vec::new(),
            untracked: Vec::new(),
        }
    }
}

#[derive(Serialize, Clone)]
pub struct GitBranchList {
    pub current: Option<String>,
    pub branches: Vec<String>,
}

/// Builds `git` with the settings the UI relies on: no colour codes, no quoted
/// non-ASCII paths, no editor prompts, and no console window on Windows.
fn command(root: &str) -> Command {
    let mut command = Command::new("git");
    command
        .arg("-c")
        .arg("core.quotepath=false")
        .arg("-c")
        .arg("color.ui=false")
        .arg("-c")
        .arg("core.editor=true")
        .arg("-C")
        .arg(root)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_OPTIONAL_LOCKS", "0");
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

fn run(root: &str, args: &[&str]) -> Result<String, String> {
    let output = command(root).args(args).output().map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            NOT_FOUND.to_string()
        } else {
            format!("Could not run git: {error}")
        }
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim_end().to_string();
    if output.status.success() {
        return Ok(stdout);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if !stderr.is_empty() {
        Err(stderr)
    } else if !stdout.is_empty() {
        Err(stdout)
    } else {
        Err("git exited with a non-zero status".into())
    }
}

fn status_name(code: char) -> &'static str {
    match code {
        'M' | 'T' => "modified",
        'A' => "added",
        'D' => "deleted",
        'R' => "renamed",
        'C' => "copied",
        'U' => "conflicted",
        _ => "modified",
    }
}

fn normalize_path(path: &str) -> String {
    path.trim().replace('\\', "/").trim_end_matches('/').to_string()
}

/// Parses `git status --porcelain=v1 -z --branch`.
///
/// In `-z` output each entry is one NUL-terminated field of the shape
/// `XY path`, except renames/copies where the original path follows in the next
/// field (`R  new\0old\0`). The `## branch...upstream [ahead 1, behind 2]`
/// header is the first field.
fn parse_status(
    raw: &str,
) -> (
    Option<String>,
    Option<String>,
    u32,
    u32,
    Vec<GitFile>,
    Vec<GitFile>,
    Vec<GitFile>,
) {
    let mut branch = None;
    let mut upstream = None;
    let mut ahead = 0;
    let mut behind = 0;
    let mut staged: Vec<GitFile> = Vec::new();
    let mut changes: Vec<GitFile> = Vec::new();
    let mut untracked: Vec<GitFile> = Vec::new();

    let mut fields = raw.split('\0');
    while let Some(field) = fields.next() {
        if field.is_empty() {
            continue;
        }

        if let Some(header) = field.strip_prefix("## ") {
            let (name, track, ahead_count, behind_count) = parse_branch(header);
            branch = name;
            upstream = track;
            ahead = ahead_count;
            behind = behind_count;
            continue;
        }

        let bytes = field.as_bytes();
        if bytes.len() < 4 {
            continue;
        }
        let x = bytes[0] as char;
        let y = bytes[1] as char;
        let path = &field[3..];

        let orig_path = if matches!(x, 'R' | 'C') || matches!(y, 'R' | 'C') {
            fields.next().map(|value| value.to_string())
        } else {
            None
        };

        if x == '?' && y == '?' {
            untracked.push(GitFile {
                path: path.to_string(),
                orig_path: None,
                status: "untracked".into(),
                staged: false,
            });
            continue;
        }

        let conflicted = x == 'U'
            || y == 'U'
            || (x == 'A' && y == 'A')
            || (x == 'D' && y == 'D');
        if conflicted {
            changes.push(GitFile {
                path: path.to_string(),
                orig_path,
                status: "conflicted".into(),
                staged: false,
            });
            continue;
        }

        if x != ' ' && x != '!' {
            staged.push(GitFile {
                path: path.to_string(),
                orig_path: orig_path.clone(),
                status: status_name(x).into(),
                staged: true,
            });
        }
        if y != ' ' && y != '!' {
            changes.push(GitFile {
                path: path.to_string(),
                orig_path,
                status: status_name(y).into(),
                staged: false,
            });
        }
    }

    let sort = |list: &mut Vec<GitFile>| {
        list.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    };
    sort(&mut staged);
    sort(&mut changes);
    sort(&mut untracked);

    (branch, upstream, ahead, behind, staged, changes, untracked)
}

fn parse_branch(header: &str) -> (Option<String>, Option<String>, u32, u32) {
    let rest = header.trim();
    if rest.is_empty() {
        return (None, None, 0, 0);
    }
    if let Some(name) = rest.strip_prefix("No commits yet on ") {
        return (Some(name.trim().to_string()), None, 0, 0);
    }
    if rest.starts_with("HEAD (no branch)") {
        return (None, None, 0, 0);
    }

    let (names, extra) = match rest.find(" [") {
        Some(index) => (
            &rest[..index],
            rest[index..]
                .trim_start()
                .trim_start_matches('[')
                .trim_end_matches(']'),
        ),
        None => (rest, ""),
    };

    let (branch, upstream) = match names.find("...") {
        Some(index) => (&names[..index], Some(names[index + 3..].to_string())),
        None => (names, None),
    };

    let mut ahead = 0;
    let mut behind = 0;
    for part in extra.split(',') {
        let part = part.trim();
        if let Some(count) = part.strip_prefix("ahead ") {
            ahead = count.trim().parse().unwrap_or(0);
        } else if let Some(count) = part.strip_prefix("behind ") {
            behind = count.trim().parse().unwrap_or(0);
        }
    }

    let branch = branch.trim();
    (
        if branch.is_empty() {
            None
        } else {
            Some(branch.to_string())
        },
        upstream.filter(|name| !name.is_empty()),
        ahead,
        behind,
    )
}

#[tauri::command]
pub async fn git_status(root: String) -> Result<GitStatus, String> {
    let toplevel = match run(&root, &["rev-parse", "--show-toplevel"]) {
        Ok(path) => path,
        Err(error) if error == NOT_FOUND => return Err(error),
        Err(_) => return Ok(GitStatus::not_repo()),
    };
    if toplevel.trim().is_empty() {
        return Ok(GitStatus::not_repo());
    }
    let toplevel = normalize_path(&toplevel);

    let raw = run(
        &toplevel,
        &[
            "status",
            "--porcelain=v1",
            "-z",
            "--branch",
            "--untracked-files=all",
        ],
    )?;
    let (branch, upstream, ahead, behind, staged, changes, untracked) = parse_status(&raw);

    Ok(GitStatus {
        is_repo: true,
        repo_root: Some(toplevel),
        branch,
        upstream,
        ahead,
        behind,
        staged,
        changes,
        untracked,
    })
}

#[tauri::command]
pub async fn git_stage(root: String, paths: Vec<String>) -> Result<String, String> {
    if paths.is_empty() {
        return Ok(String::new());
    }
    let mut args = vec!["add", "-A", "--"];
    args.extend(paths.iter().map(String::as_str));
    run(&root, &args)
}

#[tauri::command]
pub async fn git_unstage(root: String, paths: Vec<String>) -> Result<String, String> {
    if paths.is_empty() {
        return Ok(String::new());
    }
    let has_head = run(&root, &["rev-parse", "--verify", "--quiet", "HEAD"]).is_ok();
    let mut args = if has_head {
        vec!["restore", "--staged", "--"]
    } else {
        // Unborn branch: `restore` has no HEAD to compare against.
        vec!["rm", "--cached", "-r", "-q", "--ignore-unmatch", "--"]
    };
    args.extend(paths.iter().map(String::as_str));
    run(&root, &args)
}

#[tauri::command]
pub async fn git_discard(root: String, paths: Vec<String>) -> Result<String, String> {
    for path in &paths {
        if path.contains("..") || Path::new(path).is_absolute() {
            return Err("Invalid path".into());
        }
        let in_head = run(&root, &["cat-file", "-e", &format!("HEAD:{path}")]).is_ok();
        if in_head {
            run(
                &root,
                &["restore", "--source=HEAD", "--worktree", "--", path.as_str()],
            )?;
        } else {
            // Untracked or newly added file: drop the index entry and the file.
            let _ = run(
                &root,
                &["rm", "--cached", "-r", "-q", "--ignore-unmatch", "--", path.as_str()],
            );
            let target = Path::new(&root).join(path);
            let _ = if target.is_dir() {
                fs::remove_dir_all(&target)
            } else {
                fs::remove_file(&target)
            };
        }
    }
    Ok(String::new())
}

#[tauri::command]
pub async fn git_commit(root: String, message: String) -> Result<String, String> {
    let message = message.trim();
    if message.is_empty() {
        return Err("EMPTY_MESSAGE".into());
    }
    run(&root, &["commit", "-m", message])
}

#[tauri::command]
pub async fn git_push(root: String) -> Result<String, String> {
    run(&root, &["push"])
}

#[tauri::command]
pub async fn git_pull(root: String) -> Result<String, String> {
    run(&root, &["pull"])
}

#[tauri::command]
pub async fn git_init(root: String) -> Result<String, String> {
    run(&root, &["init"])
}

#[tauri::command]
pub async fn git_branches(root: String) -> Result<GitBranchList, String> {
    let raw = run(&root, &["branch", "--format=%(refname:short)"])?;
    let mut branches: Vec<String> = raw
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect();
    branches.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));

    let current = run(&root, &["symbolic-ref", "--quiet", "--short", "HEAD"])
        .ok()
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty())
        .or_else(|| {
            run(&root, &["rev-parse", "--short", "HEAD"])
                .ok()
                .map(|name| name.trim().to_string())
        });

    Ok(GitBranchList { current, branches })
}

#[tauri::command]
pub async fn git_checkout(root: String, branch: String) -> Result<String, String> {
    let branch = branch.trim();
    if branch.is_empty() || branch.starts_with('-') {
        return Err("Invalid branch name".into());
    }
    run(&root, &["checkout", branch])
}

#[tauri::command]
pub async fn git_diff(root: String, path: String, staged: bool) -> Result<String, String> {
    let mut args = vec!["diff", "--no-color", "--no-ext-diff"];
    if staged {
        args.push("--cached");
    }
    args.push("--");
    args.push(&path);
    let diff = run(&root, &args)?;
    if !diff.trim().is_empty() || staged {
        return Ok(diff);
    }

    // Untracked files have no diff: present them as a new-file patch so the
    // editor can show what would be committed.
    let tracked = run(&root, &["ls-files", "--error-unmatch", "--", &path]).is_ok();
    if tracked {
        return Ok(String::new());
    }

    let full = Path::new(&root).join(&path);
    let meta = match fs::metadata(&full) {
        Ok(meta) => meta,
        Err(_) => return Ok(String::new()),
    };
    if meta.len() > 2 * 1024 * 1024 {
        return Ok(format!("Binary or oversized file: {path}"));
    }
    let bytes = fs::read(&full).map_err(|error| error.to_string())?;
    if bytes.contains(&0) {
        return Ok(format!("Binary file: {path}"));
    }
    let text = String::from_utf8_lossy(&bytes);
    let count = text.lines().count();
    let mut patch = format!(
        "diff --git a/{path} b/{path}\nnew file mode 100644\n--- /dev/null\n+++ b/{path}\n@@ -0,0 +1,{count} @@"
    );
    for line in text.lines() {
        patch.push('\n');
        patch.push('+');
        patch.push_str(line);
    }
    patch.push('\n');
    Ok(patch)
}
