import { UnsupportedFeatureError } from "./aiErrors";

export type Avail = 'available'|'downloadable'|'unavailable';

export function requireFeature(name: string) {
  if (!(name in self)) throw new UnsupportedFeatureError(`${name} not supported`);
}

export function onDownload(monitor: any, cb: (ratio01:number)=>void) {
  if (!monitor) return;
  monitor.addEventListener?.('downloadprogress', (e: any) => cb(e.loaded));
}
