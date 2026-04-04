import { create } from 'zustand';

export type TableStatusType = 'EMPTY' | 'HOLD' | 'SENT' | 'BILL_REQUESTED' | 'LOCKED';

export type TableStatus = {
  section: string;
  tableNo: string;
  orderId: string;
  startTime: number;
  status: TableStatusType;
};

type TableStatusState = {
  tables: TableStatus[];
  lockedTables: string[]; // Store table IDs that are locked
  updateTableStatus: (
    section: string,
    tableNo: string,
    orderId: string,
    status: TableStatusType,
    startTime?: number
  ) => void;
  clearTable: (section: string, tableNo: string) => void;
  lockTable: (tableId: string) => void;
  unlockTable: (tableId: string) => void;
  isTableLocked: (tableId: string) => boolean;
  getTables: () => TableStatus[];
};

export const useTableStatusStore = create<TableStatusState>((set, get) => ({
  tables: [],
  lockedTables: [],

  updateTableStatus: (section, tableNo, orderId, status, startTime) => {
    set((state) => {
      const existingIndex = state.tables.findIndex(
        (t) => t.section === section && t.tableNo === tableNo
      );

      if (existingIndex > -1) {
        const updatedTables = [...state.tables];
        updatedTables[existingIndex] = {
          ...updatedTables[existingIndex],
          orderId,
          status,
          startTime: startTime || updatedTables[existingIndex].startTime,
        };
        return { tables: updatedTables };
      } else {
        return {
          tables: [
            ...state.tables,
            {
              section,
              tableNo,
              orderId,
              startTime: startTime || Date.now(),
              status,
            },
          ],
        };
      }
    });
  },

  clearTable: (section, tableNo) => {
    set((state) => ({
      tables: state.tables.filter(
        (t) => !(t.section === section && t.tableNo === tableNo)
      ),
    }));
  },

  lockTable: (tableId) => {
    set((state) => {
      if (!state.lockedTables.includes(tableId)) {
        return { lockedTables: [...state.lockedTables, tableId] };
      }
      return state;
    });
  },

  unlockTable: (tableId) => {
    set((state) => ({
      lockedTables: state.lockedTables.filter((id) => id !== tableId),
    }));
  },

  isTableLocked: (tableId) => {
    return get().lockedTables.includes(tableId);
  },

  getTables: () => get().tables,
}));

// Legacy wrappers for compatibility if needed, but components should use useTableStatusStore
export const getTables = () => useTableStatusStore.getState().getTables();
export const updateTableStatus = (
  section: string,
  tableNo: string,
  orderId: string,
  status: TableStatusType,
  startTime?: number
) => useTableStatusStore.getState().updateTableStatus(section, tableNo, orderId, status, startTime);
export const clearTable = (section: string, tableNo: string) => 
  useTableStatusStore.getState().clearTable(section, tableNo);

export const setTableActive = (
  section: string,
  tableNo: string,
  orderId: string,
) => {
  updateTableStatus(section, tableNo, orderId, 'SENT', Date.now());
};

export const setTableHold = (
  section: string,
  tableNo: string,
  orderId: string,
) => {
  updateTableStatus(section, tableNo, orderId, 'HOLD', Date.now());
};

