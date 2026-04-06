import { create } from 'zustand';

export type TableStatusType = 'EMPTY' | 'HOLD' | 'SENT' | 'BILL_REQUESTED' | 'LOCKED';

export type TableStatus = {
  section: string;
  tableNo: string;
  orderId: string;
  startTime: number;
  status: TableStatusType;
  lockedByName?: string;  // Name of person/customer who locked the table
};

type TableStatusState = {
  tables: TableStatus[];
  lockedTables: string[]; // Store table IDs that are locked
  lockedTableNames: Record<string, string>; // Map tableNo to locked person name
  updateTableStatus: (
    section: string,
    tableNo: string,
    orderId: string,
    status: TableStatusType,
    startTime?: number,
    lockedByName?: string
  ) => void;
  clearTable: (section: string, tableNo: string) => void;
  lockTable: (tableId: string, lockedByName?: string) => void;
  unlockTable: (tableId: string) => void;
  isTableLocked: (tableId: string) => boolean;
  getLockedName: (tableNo: string) => string | undefined;
  setLockedName: (tableNo: string, name: string) => void;
  getTables: () => TableStatus[];
};

export const useTableStatusStore = create<TableStatusState>((set, get) => ({
  tables: [],
  lockedTables: [],
  lockedTableNames: {},

  updateTableStatus: (section, tableNo, orderId, status, startTime, lockedByName) => {
    set((state) => {
      const existingIndex = state.tables.findIndex(
        (t) => t.section === section && t.tableNo === tableNo
      );

      const newState = { ...state };
      if (status === 'LOCKED' && lockedByName) {
        newState.lockedTableNames = { ...state.lockedTableNames, [tableNo]: lockedByName };
      } else if (status !== 'LOCKED') {
        const { [tableNo]: _, ...rest } = newState.lockedTableNames;
        newState.lockedTableNames = rest;
      }

      if (existingIndex > -1) {
        const updatedTables = [...state.tables];
        updatedTables[existingIndex] = {
          ...updatedTables[existingIndex],
          orderId,
          status,
          startTime: startTime || updatedTables[existingIndex].startTime,
          lockedByName,
        };
        return { ...newState, tables: updatedTables };
      } else {
        return {
          ...newState,
          tables: [
            ...state.tables,
            {
              section,
              tableNo,
              orderId,
              startTime: startTime || Date.now(),
              status,
              lockedByName,
            },
          ],
        };
      }
    });
  },

  clearTable: (section, tableNo) => {
    set((state) => {
      const { [tableNo]: _, ...rest } = state.lockedTableNames;
      return {
        tables: state.tables.filter(
          (t) => !(t.section === section && t.tableNo === tableNo)
        ),
        lockedTableNames: rest,
      };
    });
  },

  lockTable: (tableId, lockedByName) => {
    set((state) => {
      if (!state.lockedTables.includes(tableId)) {
        const newState = { lockedTables: [...state.lockedTables, tableId] };
        if (lockedByName) {
          newState.lockedTableNames = { ...state.lockedTableNames, [tableId]: lockedByName };
        }
        return newState;
      }
      return state;
    });
  },

  unlockTable: (tableId) => {
    set((state) => {
      const { [tableId]: _, ...rest } = state.lockedTableNames;
      return {
        lockedTables: state.lockedTables.filter((id) => id !== tableId),
        lockedTableNames: rest,
      };
    });
  },

  isTableLocked: (tableId) => {
    return get().lockedTables.includes(tableId);
  },

  getLockedName: (tableNo) => {
    return get().lockedTableNames[tableNo];
  },

  setLockedName: (tableNo, name) => {
    set((state) => ({
      lockedTableNames: { ...state.lockedTableNames, [tableNo]: name },
    }));
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

