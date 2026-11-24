# NPQ Code

Một IDE desktop nhẹ, giao diện sáng kiểu **Visual Studio Code**, để mở thư mục và viết code.
Frontend: **TypeScript** (React + Vite + TailwindCSS + Lucide + CodeMirror 6).
Backend: **Tauri v2** (Rust).

## Tính năng

- **Open Folder**: mở bất kỳ thư mục nào làm workspace (không cần manifest, không ràng buộc framework).
- **Explorer**: cây tệp có tạo tệp/thư mục, đổi tên, xoá, copy đường dẫn, làm mới, thu gọn.
- **Editor**: tab, breadcrumb, dirty marker, lưu bằng `Ctrl+S`, **tô sáng cú pháp cho 30+ ngôn ngữ** (TS/TSX/JS/JSX, JSON, HTML/XML, CSS/SCSS/Less, Python, Rust, Go, C/C++, C#, Java, Kotlin, Scala, Dart, PHP, Ruby, Lua, SQL, YAML, Markdown, Shell, TOML, PowerShell, Dockerfile, INI/ENV, Diff…), autocomplete, bracket matching, tìm kiếm trong tệp.
- **Xem trước tệp nhị phân & media**: ảnh (PNG/JPG/GIF/WebP/BMP/ICO/AVIF/TIFF) có zoom và kích thước gốc, video (MP4/WebM/MOV/MKV…), âm thanh (MP3/WAV/OGG/FLAC…), PDF; tệp nén/tài liệu/executable hiện thẻ thông tin với nút **Mở bằng ứng dụng mặc định**, **Hiện trong File Explorer** và **Xem dạng văn bản**. Tệp văn bản sai encoding vẫn mở được (ký tự lỗi thay bằng �).
- **Tìm kiếm toàn workspace**: panel Search (`Ctrl+Shift+F`), kết quả theo tệp, bấm để nhảy đúng dòng/cột.
- **Quick Open**: `Ctrl+P` để mở nhanh tệp theo tên.
- **Terminal tích hợp**: chạy lệnh shell ngay trong workspace, log stream theo thời gian thực, dừng lệnh đang chạy.
- **Git / Source Control**: panel Git thật (gọi `git` CLI), hiển thị nhánh, ahead/behind, thay đổi đã stage/chưa stage/chưa theo dõi; stage, bỏ stage, huỷ thay đổi, commit (`Ctrl+Enter`), push/pull, chuyển nhánh, khởi tạo repo; mở diff từng tệp ngay trong editor (tab read-only tô màu dòng thêm/xoá).
- **Giao diện & chủ đề**: thanh trạng thái kiểu VS Code, bảng màu phẳng không gradient; 4 chủ đề **Light+** (mặc định), **Dark+**, **High Contrast**, **Solarized Light** — đổi trong **Cài đặt**, áp dụng ngay và được ghi nhớ.
- **Đa ngôn ngữ**: Tiếng Việt, English, 中文 — đổi ngay trong **Cài đặt** (biểu tượng bánh răng ở thanh bên hoặc menu **Trợ giúp → Cài đặt**), lựa chọn được ghi nhớ.
- **Recent folders**: mở lại workspace gần đây từ màn hình Welcome.
- **Khôi phục phiên làm việc**: tự mở lại thư mục, các tab đang mở (kể cả buffer chưa lưu), trạng thái mở/đóng của cây thư mục, panel đang xem và kích thước panel sau khi tắt/mở lại app.
- **Zoom giao diện**: `Ctrl+=`, `Ctrl+-`, `Ctrl+0`.

## Phím tắt

| Phím | Chức năng |
| --- | --- |
| `Ctrl+P` | Quick Open (mở tệp theo tên) |
| `Ctrl+Shift+F` | Tìm kiếm trong thư mục |
| `Ctrl+Shift+E` | Mở Explorer |
| `Ctrl+B` | Ẩn/hiện thanh bên |
| `Ctrl+S` | Lưu tệp |
| `Ctrl+Shift+S` | Lưu tất cả |
| `Ctrl+W` | Đóng tab hiện tại |
| `Ctrl+`` ` `` | Ẩn/hiện Terminal |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Phóng to / thu nhỏ / reset giao diện |

## Chạy (dev)

```bash
npm install
npm run tauri dev
```

Chỉ cần frontend (không cần Rust):

```bash
npm install
npm run dev
```

Khi chạy bằng trình duyệt, ứng dụng tự dùng workspace demo trong bộ nhớ (thư mục `/demo/npq-code`) để xem được Explorer, editor, search, terminal và panel Git (với một repo giả). Bản desktop luôn đọc thư mục thật trên đĩa và gọi `git` thật.

## Build bản release

```bash
npm run tauri build
```

Output nằm trong `src-tauri/target/release/bundle/` (`.msi`/`.exe` trên Windows, `.dmg` trên macOS, `.AppImage`/`.deb` trên Linux).

## Cấu trúc

```
src/                     # Frontend React
  components/            # TopBar, ActivityBar, Sidebar, ProjectTree, SearchPanel,
                         # SourceControlPanel, EditorArea, CodeEditor, BottomPanel,
                         # StatusBar, WelcomeScreen, QuickOpen, ContextMenu, SettingsDialog
  lib/                   # api.ts (invoke wrappers), store.tsx (state), i18n.tsx (vi/en/zh),
                         # window.ts, editor*
src-tauri/
  src/
    commands/            # project.rs (workspace + recent), fs.rs (file tree/IO),
                         # search.rs (search toàn workspace), terminal.rs (shell),
                         # git.rs (status/stage/commit/push/pull/branch/diff qua git CLI)
  icons/                 # icon ứng dụng
```

Terminal dùng shell sẵn có của máy (`cmd.exe` trên Windows, `sh` trên macOS/Linux), chạy trực tiếp trong thư mục đã mở.
