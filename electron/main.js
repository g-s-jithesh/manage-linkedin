const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { autoUpdater } = require("electron-updater");

const PORT = 3000; // must match LINKEDIN_REDIRECT_URI (http://localhost:3000/api/auth/linkedin/callback)
let server;

// Settings live in <userData>/.env (GROQ_API_KEY, LINKEDIN_*). Created from the template on first run.
function loadEnv() {
  const file = path.join(app.getPath("userData"), ".env");
  if (!fs.existsSync(file)) {
    const tpl = path.join(process.resourcesPath, ".env.example");
    fs.writeFileSync(file, fs.existsSync(tpl) ? fs.readFileSync(tpl) : "GROQ_API_KEY=\n");
    dialog.showMessageBoxSync({
      type: "info",
      title: "First-time setup",
      message: "Add your keys to finish setup",
      detail: "A settings file will open next. Fill in GROQ_API_KEY and the LINKEDIN_* values, save it, then restart the app.",
    });
    shell.openPath(file);
  }
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function startServer() {
  if (!app.isPackaged) return; // dev: run `npm run dev` yourself
  const dir = path.join(process.resourcesPath, "app-server");
  server = spawn(process.execPath, [path.join(dir, "server.js")], {
    cwd: dir,
    env: { ...process.env, ...loadEnv(), DATA_DIR: app.getPath("userData"), ELECTRON_RUN_AS_NODE: "1", PORT: String(PORT), HOSTNAME: "localhost", NODE_ENV: "production" },
    stdio: "ignore",
  });
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(`http://localhost:${PORT}`); return; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
}

const portInUse = () => fetch(`http://localhost:${PORT}`).then(() => true, () => false);

app.whenReady().then(async () => {
  if (app.isPackaged && (await portInUse())) {
    dialog.showErrorBox("Port 3000 is busy", "Close whatever is using port 3000 (another dev server?) and start the app again.");
    return app.quit();
  }
  startServer();
  await waitForServer();
  // Route modules load lazily; touch the schedule API so saved scheduled posts are re-armed right away.
  fetch(`http://localhost:${PORT}/api/linkedin/schedule`).catch(() => {});
  if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  const win = new BrowserWindow({ width: 1280, height: 860, autoHideMenuBar: true, icon: path.join(__dirname, "../build/icon.png") });
  // Keep the app and the LinkedIn login on localhost / linkedin.com inside; everything else opens in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.loadURL(`http://localhost:${PORT}`);
});

app.on("window-all-closed", () => app.quit());
app.on("quit", () => server && server.kill());
