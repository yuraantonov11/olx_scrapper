import { contextBridge, ipcRenderer } from 'electron';
import { IpcRendererEvent } from 'electron/main';

// todo: Fix issue
window.electron = require('electron');

const electronHandler = {
  startScrapper(
    creds: { email?: string; password?: string },
    args: { isShowingBrowser: boolean },
  ) {
    ipcRenderer.send('start-scrapper', creds, args);
  },
  stopScrapper() {
    ipcRenderer.send('stop-scrapper');
  },
  // sendScraperProgress(creds: any, args: any) {
  //   ipcRenderer.send('scraper-progress', creds, args);
  // },
  onProgress(func: (data: { progress: number; isRunning: boolean }) => void) {
    const subscription = (
      _event: IpcRendererEvent,
      data: { progress: number; isRunning: boolean },
    ) => func(data);
    ipcRenderer.on('scraper-progress', subscription);

    return () => {
      ipcRenderer.removeListener('scraper-progress', subscription);
    };
  },
  onEnd(func: (data: { fileName: string }) => void) {
    const subscription = (
      _event: IpcRendererEvent,
      data: { fileName: string },
    ) => func(data);
    ipcRenderer.on('scraper-end', subscription);

    return () => {
      ipcRenderer.removeListener('scraper-end', subscription);
    };
  },
  // once(channel: Channels, func: (...args: unknown[]) => void) {
  //   ipcRenderer.once(channel, (_event, ...args) => func(...args));
  // },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
