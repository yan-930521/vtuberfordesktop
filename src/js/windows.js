const path = require("path");
const { screen, BrowserWindow } = require("electron");
const Settings = require("../json/setting.json");

module.exports.createMainWindow = () => {
    let winX = screen.getPrimaryDisplay().workAreaSize.width - Settings.MainWindow.Width - Settings.MoveImg.Width;
    let winY = screen.getPrimaryDisplay().workAreaSize.height - Settings.MainWindow.Height - Settings.MoveImg.Height;
    const win = new BrowserWindow({
        x: winX,
        y: winY,
        width: Settings.MainWindow.Width,
        height: Settings.MainWindow.Height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        // resizable: false,
        fullscreenable: false,
        webPreferences: {
            // preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile(path.join(__dirname, "../html/index.html"));

    // win.webContents.openDevTools();

    // win.setIgnoreMouseEvents(true);

    return win;
}