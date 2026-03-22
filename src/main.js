import path from "path";
import url from "url";
import { app, Menu, ipcMain, shell, Notification } from "electron";
import appMenuTemplate from "./menu/app_menu_template";
import settingsMenuTemplate from "./menu/settings_menu_template";
import devMenuTemplate from "./menu/dev_menu_template";
import createWindow from "./helpers/window";
import { DEFAULT_CONFIG } from "./helpers/config";
const fs = require('fs');
const cron = require('node-cron');

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from "env";

// Performance and memory flags
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
app.commandLine.appendSwitch('max-active-webgl-contexts=16');

// WebRTC and streaming optimisations
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode');
app.commandLine.appendSwitch('disable-frame-rate-limit');
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer,WebRTC-H264WithOpenH264FFmpeg,PlatformHEVCDecoderSupport,WebCodecs,MediaCapabilitiesQueryGpuFactories');
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
app.commandLine.appendSwitch('enable-gpu-rasterization');

// IP cameras commonly use self-signed TLS certificates.  Allow those in
// non-production environments; in production the flag is intentionally
// omitted so the OS certificate store is respected.
if (env.name !== "production") {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== "production") {
  const userDataPath = app.getPath("userData");
  app.setPath("userData", `${userDataPath} (${env.name})`);
}

if (process.platform === 'win32') {
  app.setAppUserModelId(app.name);
}

const setApplicationMenu = () => {
  const menus = [appMenuTemplate, settingsMenuTemplate];
  if (env.name !== "production") {
    menus.push(devMenuTemplate);
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// We can communicate with our window (the renderer process) via messages.
const initIpc = () => {
  ipcMain.on("need-app-path", (event, arg) => {
    event.reply("app-path", app.getAppPath());
  });
  ipcMain.on("open-external-link", (event, href) => {
    shell.openExternal(href);
  });
};

function getConfig() {
  const configPath = app.getPath("userData") + "/config.json";
  let data = Object.assign({}, DEFAULT_CONFIG);
  try {
    data = Object.assign(data, JSON.parse(fs.readFileSync(configPath)));
  } catch {
    // Config doesn't exist yet; defaults will be used.
  }
  let appurl = {};
  if (!data.url || data.url === DEFAULT_CONFIG.url) {
    appurl.name = __dirname + "/no-url.html";
    appurl.protocol = "file:";
  } else {
    try {
      const parsed = new URL(data.url);
      appurl.name = parsed.host + parsed.pathname.replace(/\/$/, "");
      appurl.protocol = parsed.protocol;
    } catch {
      // Fallback for malformed URLs
      appurl.name = data.url.replace(/^https?:\/\//, "");
      appurl.protocol = "http:";
    }
  }
  return {
    url: appurl,
    autorefresh: data.autorefresh,
    grid: data.grid,
    mediamtxUrl: data.mediamtxUrl || ""
  };
}

app.on("ready", () => {
  setApplicationMenu();
  initIpc();

  let config = getConfig();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      allowRunningInsecureContent: true,
      // webSecurity is disabled so that the CamViewerPlus web UI (loaded from
      // a configured server origin) can make cross-origin requests to MediaMTX
      // WHEP endpoints.  This is intentional for a dedicated camera-viewer
      // desktop client that only ever loads known, user-configured servers.
      webSecurity: false
    }
  });

  // Permissions required for WebRTC (WHEP/camera streams) and notifications.
  // Only the specific capabilities needed by live-streaming are granted.
  const ALLOWED_PERMISSIONS = [
    'media',
    'display-capture',
    'fullscreen',
    'notifications',
    'pointerLock',
    'mediaKeySystem'
  ];
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      callback(ALLOWED_PERMISSIONS.includes(permission));
    }
  );
  mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission) => ALLOWED_PERMISSIONS.includes(permission)
  );

  if (config.autorefresh && config.autorefresh !== "-1") {
    cron.schedule(config.autorefresh, () => {
      console.log("reloading...");
      mainWindow.webContents.reloadIgnoringCache();
    });
  }

  const buildLoadURL = (pathname) =>
    url.format({
      pathname,
      protocol: config.url.protocol,
      slashes: true,
      query: { cl: "cvpc" }
    });

  if (config.grid && config.grid !== "-1") {
    mainWindow.loadURL(buildLoadURL(config.url.name + "/grids/" + config.grid));
  } else {
    mainWindow.loadURL(buildLoadURL(config.url.name));
  }

  mainWindow.webContents.on("did-fail-load", () => {
    new Notification({
      title: "Error!",
      body: "Unable to connect to CamViewerPlus Server. Please double-check your instance URL.",
    }).show();
    mainWindow.loadURL(
      url.format({
        pathname: __dirname + "/error.html",
        protocol: "file:",
        slashes: true
      })
    );
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
