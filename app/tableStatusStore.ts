type TableStatus = {
  section: string;
  tableNo: string;
  orderId: string;
  startTime: number;
};

let tables: TableStatus[] = [];

/* ================= GET TABLES ================= */

export const getTables = () => tables;

/* ================= SET TABLE ACTIVE ================= */

export const setTableActive = (
  section: string,
  tableNo: string,
  orderId: string,
) => {
  const existing = tables.find(
    (t) => t.section === section && t.tableNo === tableNo,
  );

  if (existing) {
    existing.orderId = orderId;
    existing.startTime = Date.now();
  } else {
    tables.push({
      section,
      tableNo,
      orderId,
      startTime: Date.now(),
    });
  }
};

/* ================= HOLD TABLE ================= */

export const setTableHold = (
  section: string,
  tableNo: string,
  orderId: string,
) => {
  const existing = tables.find(
    (t) => t.section === section && t.tableNo === tableNo,
  );

  if (existing) {
    existing.orderId = orderId;
  } else {
    tables.push({
      section,
      tableNo,
      orderId,
      startTime: Date.now(),
    });
  }
};

/* ================= CLEAR TABLE ================= */

export const clearTable = (section: string, tableNo: string) => {
  tables = tables.filter(
    (t) => !(t.section === section && t.tableNo === tableNo),
  );
};
