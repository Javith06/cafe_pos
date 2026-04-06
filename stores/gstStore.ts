import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

/* ================= TYPES ================= */

export type GstTaxMode = "none" | "exclusive" | "inclusive";

interface GstState {
  enabled: boolean;
  percentage: number;
  registrationNumber: string;
  isConfigured: boolean;
  taxMode: GstTaxMode;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (
    percentage: number,
    regNo: string,
    taxMode: GstTaxMode,
  ) => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
}

const STORAGE_KEY = "gst-settings-v5";

/* ================= STORE ================= */

export const useGstStore = create<GstState>((set, get) => ({
  enabled: false,
  percentage: 9,
  registrationNumber: "",
  isConfigured: false,
  taxMode: "exclusive",

  loadSettings: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          enabled: parsed.enabled ?? false,
          percentage: parsed.percentage ?? 9,
          registrationNumber: parsed.registrationNumber ?? "",
          isConfigured: parsed.isConfigured ?? false,
          taxMode: parsed.taxMode ?? "exclusive",
        });
      }
    } catch (e) {
      console.error("Failed to load GST settings:", e);
    }
  },

  updateSettings: async (percentage, regNo, taxMode) => {
    const newState = {
      percentage,
      registrationNumber: regNo,
      taxMode,
      isConfigured: true,
      enabled: taxMode !== "none",
    };
    set(newState);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...get(), ...newState }),
      );
    } catch (e) {
      console.error("Failed to save GST settings:", e);
    }
  },

  setEnabled: async (enabled) => {
    set({ enabled });
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...get(), enabled }),
      );
    } catch (e) {
      console.error("Failed to set GST enabled:", e);
    }
  },
}));
