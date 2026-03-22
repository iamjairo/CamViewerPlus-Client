import { app } from "electron";
import { BrowserWindow } from "electron";
import { Notification  } from "electron";
import { DEFAULT_CONFIG } from "../helpers/config";

const prompt = require('electron-prompt');
const fs = require('fs');
const request = require('request');

const promptCss = __dirname + "/prompt.css";

export default {
  label: "Configuration",
  submenu: [
    {
      label: "Set Instance URL",
      accelerator: "CmdOrCtrl+I",
      click: () => {
        openInstancePrompt();
      }
    }, {
      label: "Set MediaMTX Server URL",
      accelerator: "CmdOrCtrl+M",
      click: () => {
        openMediaMTXPrompt();
      }
    }, {
      label: "Set Auto-Refresh Delay",
      accelerator: "CmdOrCtrl+D",
      click: () => {
        openAutoRefreshPrompt();
      }
    }, {
      label: "Set Default Grid Override",
      accelerator: "CmdOrCtrl+G",
      click: () => {
        openGridPrompt();
      }
    }, {
      label: "Open Settings",
      accelerator: "CmdOrCtrl+S",
      click: () => {
        openSettings();
      }
    }
  ]
};


const DEFAULT_CONFIG_STR = JSON.stringify(DEFAULT_CONFIG);

function readConfig() {
  const configPath = app.getPath("userData") + "/config.json";
  let rawdata = DEFAULT_CONFIG_STR;
  try {
    rawdata = fs.readFileSync(configPath);
  } catch {
    // Config doesn't exist yet; defaults will be used.
  }
  return { path: configPath, data: Object.assign({}, DEFAULT_CONFIG, JSON.parse(rawdata)) };
}

function saveConfigAndRelaunch(configPath, data) {
  fs.writeFileSync(configPath, JSON.stringify(data));
  app.relaunch();
  app.exit();
}

function openInstancePrompt() {
  const { path: configPath, data } = readConfig();
  prompt({
    title: 'Set Instance URL',
    label: 'Instance URL:',
    value: data.url,
    customStylesheet: promptCss,
    height: 175,
    inputAttrs: {
      type: 'url'
    },
    type: 'input'
  })
    .then((r) => {
      if (r === null) {
        console.log('user cancelled');
      } else {
        data.url = r;
        saveConfigAndRelaunch(configPath, data);
      }
    })
    .catch(console.error);
}

function openMediaMTXPrompt() {
  const { path: configPath, data } = readConfig();
  prompt({
    title: 'Set MediaMTX Server URL',
    label: 'MediaMTX Server URL (e.g. http://192.168.1.10:8889):',
    value: data.mediamtxUrl || '',
    customStylesheet: promptCss,
    height: 175,
    inputAttrs: {
      type: 'url',
      placeholder: 'http://192.168.1.10:8889'
    },
    type: 'input'
  })
    .then((r) => {
      if (r === null) {
        console.log('user cancelled');
      } else {
        data.mediamtxUrl = r;
        saveConfigAndRelaunch(configPath, data);
      }
    })
    .catch(console.error);
}

function openAutoRefreshPrompt() {
  const { path: configPath, data } = readConfig();
  prompt({
    title: 'Set Auto-Refresh Delay',
    label: 'Auto-Refresh Delay:',
    customStylesheet: promptCss,
    height: 175,
    value: data.autorefresh,
    type: 'select',
    selectOptions: { "-1": "Disabled", "* * * * *": "1 minute", "*/15 * * * *": "15 minutes", "0 * * * *": "1 hour", "0 */4 * * *": "4 hours", "0 */8 * * *": "8 hours" }
  })
    .then((r) => {
      if (r === null) {
        console.log('user cancelled');
      } else {
        data.autorefresh = r;
        saveConfigAndRelaunch(configPath, data);
      }
    })
    .catch(console.error);
}

function openGridPrompt() {
  const { path: configPath, data } = readConfig();

  const gridUrl = data.url + "/getGrids";
  let options = { json: true };
  request(gridUrl, options, (error, res, body) => {
    if (error) {
      new Notification({
        title: "Error!",
        body: "Unable to fetch available grids.",
      }).show();
      return;
    }

    if (res.statusCode == 200 && body != undefined && body.length > 0) {
      const selectOptions = { "-1": "Server default" };
      body.forEach(e => {
        selectOptions[e] = e;
      });
      prompt({
        title: 'Set Default Grid Override',
        label: 'Grid for this client:',
        customStylesheet: promptCss,
        height: 175,
        value: data.grid,
        type: 'select',
        selectOptions
      })
        .then((r) => {
          if (r === null) {
            console.log('user cancelled');
          } else {
            data.grid = r;
            saveConfigAndRelaunch(configPath, data);
          }
        })
        .catch(() => {
          new Notification({
            title: "Error!",
            body: "Unable to fetch available grids.",
          }).show();
        });
    }
  });
}

function openSettings() {
  BrowserWindow.getFocusedWindow().webContents.executeJavaScript('$("#settings").show();0');
}