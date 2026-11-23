use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

/// Every command that has been started in this session, keyed by id. The entry
/// lives until the process exits, so the UI can stop a long-running command.
pub struct TerminalState(pub Mutex<HashMap<u32, Arc<Process>>>);

pub struct Process {
    child: Mutex<Option<Child>>,
}

#[derive(Clone, Serialize)]
struct TerminalOutput {
    id: u32,
    stream: String,
    line: String,
}

#[derive(Clone, Serialize)]
struct TerminalDone {
    id: u32,
    code: i32,
    success: bool,
}

static NEXT_ID: AtomicU32 = AtomicU32::new(1);

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(windows)]
fn no_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn no_window(_cmd: &mut Command) {}

#[cfg(windows)]
fn shell_command(command: &str) -> Command {
    let mut cmd = Command::new("cmd.exe");
    cmd.arg("/C").arg(command);
    cmd
}

#[cfg(not(windows))]
fn shell_command(command: &str) -> Command {
    let mut cmd = Command::new("sh");
    cmd.arg("-lc").arg(command);
    cmd
}

#[cfg(windows)]
fn kill_tree(child: &mut Child) {
    let pid = child.id().to_string();
    let mut taskkill = Command::new("taskkill.exe");
    taskkill
        .args(["/PID", pid.as_str(), "/T", "/F"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    no_window(&mut taskkill);
    let _ = taskkill.status();
    let _ = child.kill();
}

#[cfg(not(windows))]
fn kill_tree(child: &mut Child) {
    let _ = child.kill();
}

fn stream_lines<R: Read + Send + 'static>(app: AppHandle, reader: R, id: u32, stream: &'static str) {
    let reader = BufReader::new(reader);
    thread::spawn(move || {
        for line in reader.lines().map_while(Result::ok) {
            let _ = app.emit(
                "terminal-output",
                TerminalOutput {
                    id,
                    stream: stream.into(),
                    line,
                },
            );
        }
    });
}

#[tauri::command]
pub fn run_command(
    app: AppHandle,
    state: State<'_, TerminalState>,
    cwd: String,
    command: String,
) -> Result<u32, String> {
    let command = command.trim().to_string();
    if command.is_empty() {
        return Err("Nothing to run".into());
    }
    let cwd_path: PathBuf = PathBuf::from(&cwd);
    if !cwd_path.is_dir() {
        return Err("Workspace folder no longer exists".into());
    }

    let id = NEXT_ID.fetch_add(1, Ordering::SeqCst);
    let mut cmd = shell_command(&command);
    cmd.current_dir(&cwd_path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    no_window(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Could not start the command: {e}"))?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let process = Arc::new(Process {
        child: Mutex::new(Some(child)),
    });
    state.0.lock().unwrap().insert(id, process.clone());

    if let Some(stdout) = stdout {
        stream_lines(app.clone(), stdout, id, "stdout");
    }
    if let Some(stderr) = stderr {
        stream_lines(app.clone(), stderr, id, "stderr");
    }

    // Reap the child and report the exit code. `try_wait` is polled instead of
    // `wait` so `stop_command` can still lock the handle and kill the process.
    let waiter_app = app.clone();
    thread::spawn(move || {
        loop {
            let status = {
                let mut guard = process.child.lock().unwrap();
                match guard.as_mut() {
                    Some(child) => child.try_wait().ok().flatten(),
                    None => break,
                }
            };
            if let Some(status) = status {
                let code = status.code().unwrap_or(-1);
                let _ = waiter_app.emit(
                    "terminal-done",
                    TerminalDone {
                        id,
                        code,
                        success: status.success(),
                    },
                );
                break;
            }
            thread::sleep(Duration::from_millis(60));
        }
        let state = waiter_app.state::<TerminalState>();
        state.0.lock().unwrap().remove(&id);
    });

    Ok(id)
}

#[tauri::command]
pub fn stop_command(state: State<'_, TerminalState>, id: u32) -> Result<(), String> {
    let process = state.0.lock().unwrap().get(&id).cloned();
    let Some(process) = process else {
        return Ok(());
    };
    if let Some(child) = process.child.lock().unwrap().as_mut() {
        kill_tree(child);
    }
    Ok(())
}

#[tauri::command]
pub fn stop_all_commands(state: State<'_, TerminalState>) {
    let processes: Vec<Arc<Process>> = state.0.lock().unwrap().values().cloned().collect();
    for process in processes {
        if let Some(child) = process.child.lock().unwrap().as_mut() {
            kill_tree(child);
        }
    }
}
