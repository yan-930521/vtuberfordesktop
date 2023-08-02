const Settings = require("../json/setting.json");
const Win = require("../../index.js");
const { ipcMain } = require("electron");

module.exports[Settings.IpcEvent.Close] = (e, data) => {
    switch (data) {
        case Settings.List["MainWindow"]:
            if (Win.mainWindow) {
                Win.mainWindow.close()
                Win.mainWindow = null;
            }
            break;
    }
}

module.exports[Settings.IpcEvent.Hidden] = (e, data) => {
    switch (data) {
        case Settings.List["MainWindow"]:
            if (Win.mainWindow) {
                Win.mainWindow.minimize();
            }
            break;
    }
}