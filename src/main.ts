import { app, BrowserWindow, ipcMain, screen, dialog, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { TemplateService } from './templateService';
import { RundownService } from './rundownService';
import { ThemeService } from './themeService';
import { ApiService } from './apiService';
import { GraphicTemplate } from './models';

let controlWindow: BrowserWindow | null = null;
let outputWindow: BrowserWindow | null = null;

const templateService = new TemplateService();
const rundownService = new RundownService();
const themeService = new ThemeService();
const apiService = new ApiService();

let templates: GraphicTemplate[] = [];

function getAssetsPath(): string {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'assets');
    }
    return path.join(__dirname, '..', 'assets');
}

function createOutputWindow(): void {
    const displays = screen.getAllDisplays();
    const externalDisplay = displays.length > 1 ? displays[1] : displays[0];

    outputWindow = new BrowserWindow({
        x: externalDisplay.bounds.x,
        y: externalDisplay.bounds.y,
        width: externalDisplay.bounds.width,
        height: externalDisplay.bounds.height,
        frame: false,
        fullscreen: displays.length > 1,
        backgroundColor: '#00FF00',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const outputHtml = path.join(getAssetsPath(), 'html', 'output.html');
    outputWindow.loadFile(outputHtml);

    outputWindow.on('closed', () => { outputWindow = null; });
}

function createControlWindow(): void {
    controlWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        title: 'Broadcast Control Panel',
        backgroundColor: '#1E1E1E',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    controlWindow.loadFile(path.join(__dirname, '..', 'ui', 'control.html'));

    controlWindow.on('closed', () => {
        controlWindow = null;
        if (outputWindow) outputWindow.close();
        app.quit();
    });
}

function executeOnOutput(script: string): void {
    if (outputWindow && !outputWindow.isDestroyed()) {
        outputWindow.webContents.executeJavaScript(script).catch(err => {
            console.error('Output script error:', err.message);
        });
    }
}

function broadcastRundown(): void {
    if (controlWindow && !controlWindow.isDestroyed()) {
        controlWindow.webContents.send('rundown-changed', rundownService.items);
    }
}

// --- IPC Handlers ---

function setupIPC(): void {
    ipcMain.handle('get-templates', () => {
        return templates.map(t => ({
            id: t.id,
            name: t.name,
            layer: t.layer,
            fields: t.fields
        }));
    });

    ipcMain.handle('get-rundown', () => rundownService.items);

    ipcMain.handle('add-rundown-item', (_e: IpcMainInvokeEvent, templateId: string, name: string, fieldValues: Record<string, string>) => {
        return rundownService.addItem(templateId, name, fieldValues);
    });

    ipcMain.handle('remove-rundown-item', (_e: IpcMainInvokeEvent, id: string) => {
        rundownService.removeItem(id);
    });

    ipcMain.handle('move-rundown-item', (_e: IpcMainInvokeEvent, oldIndex: number, newIndex: number) => {
        rundownService.moveItem(oldIndex, newIndex);
    });

    ipcMain.handle('rename-rundown-item', (_e: IpcMainInvokeEvent, id: string, newName: string) => {
        rundownService.renameItem(id, newName);
    });

    ipcMain.handle('update-rundown-field-values', (_e: IpcMainInvokeEvent, id: string, fieldValues: Record<string, string>) => {
        rundownService.updateFieldValues(id, fieldValues);
    });

    ipcMain.handle('replace-rundown', (_e: IpcMainInvokeEvent, items: import('./models').RundownItem[]) => {
        rundownService.replaceAll(items);
    });

    ipcMain.handle('save-rundown', async () => {
        const result = await dialog.showSaveDialog(controlWindow!, {
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
            defaultPath: 'rundown.json'
        });
        if (!result.canceled && result.filePath) {
            rundownService.saveRundown(result.filePath);
            return true;
        }
        return false;
    });

    ipcMain.handle('load-rundown', async () => {
        const result = await dialog.showOpenDialog(controlWindow!, {
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
            properties: ['openFile']
        });
        if (!result.canceled && result.filePaths.length > 0) {
            rundownService.loadRundown(result.filePaths[0]);
            return true;
        }
        return false;
    });

    ipcMain.handle('render-template', (_e: IpcMainInvokeEvent, templateId: string, fieldValues: Record<string, string>) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return null;

        const cloned: GraphicTemplate = {
            ...template,
            fields: template.fields.map(f => ({
                ...f,
                value: (fieldValues && fieldValues[f.id]) || f.value
            }))
        };
        return templateService.renderTemplate(cloned);
    });

    // Output control
    ipcMain.handle('play-rundown-item', (_e: IpcMainInvokeEvent, id: string) => {
        const item = rundownService.items.find(i => i.id === id);
        if (!item) return;
        const template = templates.find(t => t.id === item.templateId);
        if (!template) return;

        const cloned: GraphicTemplate = {
            ...template,
            fields: template.fields.map(f => ({
                ...f,
                value: item.fieldValues[f.id] || f.value
            }))
        };

        const renderedHtml = templateService.renderTemplate(cloned);
        const safeHtml = renderedHtml.replace(/'/g, "\\'").replace(/\n/g, '').replace(/\r/g, '');
        executeOnOutput(`injectGraphic('${cloned.layer}', '${safeHtml}')`);
        executeOnOutput(`updateGraphic('${cloned.id}', null, true)`);

        rundownService.setActive(id, true);
    });

    ipcMain.handle('stop-rundown-item', (_e: IpcMainInvokeEvent, id: string) => {
        const item = rundownService.items.find(i => i.id === id);
        if (!item) return;
        executeOnOutput(`updateGraphic('${item.templateId}', null, false)`);
        rundownService.setActive(id, false);
    });

    ipcMain.handle('inject-graphic', (_e: IpcMainInvokeEvent, layer: string, html: string) => {
        const safeHtml = html.replace(/'/g, "\\'").replace(/\n/g, '').replace(/\r/g, '');
        executeOnOutput(`injectGraphic('${layer}', '${safeHtml}')`);
    });

    ipcMain.handle('hide-graphic', (_e: IpcMainInvokeEvent, graphicId: string) => {
        executeOnOutput(`updateGraphic('${graphicId}', null, false)`);
    });

    ipcMain.handle('clear-output', () => {
        executeOnOutput('clearAll()');
    });

    ipcMain.handle('clear-layer', (_e: IpcMainInvokeEvent, layerId: string) => {
        executeOnOutput(`clearLayer('${layerId}')`);
    });

    // Theme
    ipcMain.handle('get-theme', () => themeService.currentTheme);

    ipcMain.handle('apply-theme', (_e: IpcMainInvokeEvent, settings: Record<string, string>) => {
        themeService.updateTheme(settings);
        const css = themeService.generateCssVariables();
        if (outputWindow && !outputWindow.isDestroyed()) {
            outputWindow.webContents.insertCSS(css);
        }
        return css;
    });

    ipcMain.handle('set-background-mode', (_e: IpcMainInvokeEvent, mode: string) => {
        executeOnOutput(`setBackgroundMode('${mode}')`);
    });

    ipcMain.handle('get-monitors', () => {
        const displays = screen.getAllDisplays();
        return displays.map((d, i) => ({
            index: i,
            width: d.bounds.width,
            height: d.bounds.height,
            isPrimary: d.bounds.x === 0 && d.bounds.y === 0,
            label: `Monitor ${i + 1}: ${d.bounds.width}x${d.bounds.height}`
        }));
    });

    ipcMain.handle('move-output-to-monitor', (_e: IpcMainInvokeEvent, index: number) => {
        const displays = screen.getAllDisplays();
        if (index < 0 || index >= displays.length) return;
        const display = displays[index];
        if (outputWindow && !outputWindow.isDestroyed()) {
            outputWindow.setBounds({
                x: display.bounds.x,
                y: display.bounds.y,
                width: display.bounds.width,
                height: display.bounds.height
            });
            if (displays.length > 1) {
                outputWindow.setFullScreen(true);
            }
        }
    });
}

// --- API service wiring ---

function setupApiCallbacks(): void {
    apiService.onPlayRundownItem = (index: number) => {
        if (index >= 0 && index < rundownService.items.length) {
            const item = rundownService.items[index];
            const template = templates.find(t => t.id === item.templateId);
            if (template) {
                const cloned: GraphicTemplate = {
                    ...template,
                    fields: template.fields.map(f => ({
                        ...f,
                        value: item.fieldValues[f.id] || f.value
                    }))
                };
                const renderedHtml = templateService.renderTemplate(cloned);
                const safeHtml = renderedHtml.replace(/'/g, "\\'").replace(/\n/g, '').replace(/\r/g, '');
                executeOnOutput(`injectGraphic('${cloned.layer}', '${safeHtml}')`);
                executeOnOutput(`updateGraphic('${cloned.id}', null, true)`);
                rundownService.setActive(item.id, true);
            }
        }
    };

    apiService.onStopRundownItem = (index: number) => {
        if (index >= 0 && index < rundownService.items.length) {
            const item = rundownService.items[index];
            executeOnOutput(`updateGraphic('${item.templateId}', null, false)`);
            rundownService.setActive(item.id, false);
        }
    };

    apiService.onHideGraphic = (graphicId: string) => {
        executeOnOutput(`updateGraphic('${graphicId}', null, false)`);
    };

    apiService.onExecuteScript = (script: string) => {
        executeOnOutput(script);
    };
}

// --- App lifecycle ---

app.whenReady().then(() => {
    templates = templateService.loadTemplates();

    setupIPC();
    setupApiCallbacks();

    rundownService.onChange(() => broadcastRundown());

    createOutputWindow();
    createControlWindow();

    apiService.start(8080);
});

app.on('window-all-closed', () => {
    apiService.stop();
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createOutputWindow();
        createControlWindow();
    }
});
