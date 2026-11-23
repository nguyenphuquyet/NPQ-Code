mod commands;

use commands::terminal::TerminalState;
use std::collections::HashMap;
use std::sync::Mutex;
#[cfg(debug_assertions)]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(TerminalState(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            commands::project::open_workspace,
            commands::project::recent_workspaces,
            commands::project::remove_recent,
            commands::fs::list_tree,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_file,
            commands::fs::create_directory,
            commands::fs::delete_path,
            commands::fs::rename_path,
            commands::search::search_workspace,
            commands::git::git_status,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_discard,
            commands::git::git_commit,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::git_init,
            commands::git::git_branches,
            commands::git::git_checkout,
            commands::git::git_diff,
            commands::terminal::run_command,
            commands::terminal::stop_command,
            commands::terminal::stop_all_commands,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
