export type TableStatusType = 'EMPTY' | 'HOLD' | 'SENT' | 'BILL_REQUESTED';

type TableStatus = {
  section: string;
  tableNo: string;
  orderId: string;
  startTime: number;
  status: TableStatusType;
};

let tables: TableStatus[] = [];

/* ================= GET TABLES ================= */

export const getTables = () => tables;

/* ================= UPDATE TABLE STATUS ================= */

export const updateTableStatus = (
  section: string,
  tableNo: string,
  orderId: string,
  status: TableStatusType,
  startTime?: number
) => {
  const existing = tables.find(
    (t) => t.section === section && t.tableNo === tableNo,
  );

  if (existing) {
    existing.orderId = orderId;
    existing.status = status;
    if (startTime) existing.startTime = startTime;
    else if (status === 'SENT' && (existing.status === 'EMPTY' || existing.status === 'HOLD')) {
        // Only reset startTime if it's a new session or moving from hold to sent
    }
  } else {
    tables.push({
      section,
      tableNo,
      orderId,
      startTime: startTime || Date.now(),
      status: status,
    });
  }
};

/* ================= LEGACY WRAPPERS ================= */

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

/* ================= CLEAR TABLE ================= */

export const clearTable = (section: string, tableNo: string) => {
  tables = tables.filter(
    (t) => !(t.section === section && t.tableNo === tableNo),
  );
};

