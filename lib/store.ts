// Example: @/lib/store.ts (or wherever useMapStore is defined)
import { create } from 'zustand';

interface PopupInfoPayload {
  trixel: number; // <<<< CHANGED: string to number
  coords: any;    // Or a more specific coordinate type like GeoJSON.Position or [number, number][]
}

interface MapState {
  resolution: number | undefined;
  setResolution: (res: number) => void;
  popupInfo: { trixel: number; coords: any } | null;
  setPopupInfo: (info: { trixel: number; coords: any } | null) => void;
  showTrixels: boolean;
  toggleTrixels: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  resolution: undefined,
  setResolution: (res) => set({ resolution: res }),
  popupInfo: null,
  setPopupInfo: (info) => set({ popupInfo: info }),
  showTrixels: true,
  toggleTrixels: () => set((state) => ({ showTrixels: !state.showTrixels })),
}));