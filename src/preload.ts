import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    // Templates
    getTemplates: () => ipcRenderer.invoke('get-templates'),

    // Rundown
    getRundown: () => ipcRenderer.invoke('get-rundown'),
    addRundownItem: (templateId: string, name: string, fieldValues: Record<string, string>) =>
        ipcRenderer.invoke('add-rundown-item', templateId, name, fieldValues),
    removeRundownItem: (id: string) => ipcRenderer.invoke('remove-rundown-item', id),
    moveRundownItem: (oldIndex: number, newIndex: number) =>
        ipcRenderer.invoke('move-rundown-item', oldIndex, newIndex),
    renameRundownItem: (id: string, newName: string) =>
        ipcRenderer.invoke('rename-rundown-item', id, newName),
    updateRundownFieldValues: (id: string, fieldValues: Record<string, string>) =>
        ipcRenderer.invoke('update-rundown-field-values', id, fieldValues),
    replaceRundown: (items: unknown[]) => ipcRenderer.invoke('replace-rundown', items),
    saveRundown: () => ipcRenderer.invoke('save-rundown'),
    loadRundown: () => ipcRenderer.invoke('load-rundown'),

    // Output control
    playRundownItem: (id: string) => ipcRenderer.invoke('play-rundown-item', id),
    stopRundownItem: (id: string) => ipcRenderer.invoke('stop-rundown-item', id),
    injectGraphic: (layer: string, html: string) => ipcRenderer.invoke('inject-graphic', layer, html),
    hideGraphic: (graphicId: string) => ipcRenderer.invoke('hide-graphic', graphicId),
    clearOutput: () => ipcRenderer.invoke('clear-output'),
    clearLayer: (layerId: string) => ipcRenderer.invoke('clear-layer', layerId),

    // Preview
    renderTemplate: (templateId: string, fieldValues: Record<string, string>) =>
        ipcRenderer.invoke('render-template', templateId, fieldValues),

    // Theme
    getTheme: () => ipcRenderer.invoke('get-theme'),
    applyTheme: (settings: Record<string, string>) => ipcRenderer.invoke('apply-theme', settings),

    // Settings
    setBackgroundMode: (mode: string) => ipcRenderer.invoke('set-background-mode', mode),
    getMonitors: () => ipcRenderer.invoke('get-monitors'),
    moveOutputToMonitor: (index: number) => ipcRenderer.invoke('move-output-to-monitor', index),

    // Events from main process
    onRundownChanged: (callback: (items: unknown[]) => void) => {
        ipcRenderer.on('rundown-changed', (_event, items) => callback(items));
    }
});
