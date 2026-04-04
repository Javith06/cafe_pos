
let orderCounter = 1;

/**
 * Generate a unique Order ID in format #XXXXXX (6 uppercase alphanumeric)
 * Examples: #A5F2D9, #K7M3P1
 */
export const getNextOrderId = () => {
  // Generate random 6-character alphanumeric code
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "#";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Check if order ID is unique (will be validated on backend during save)
 */
export const validateOrderId = (orderId: string): boolean => {
  return /^#[A-Z0-9]{6}$/.test(orderId);
};

