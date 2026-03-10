
let orderCounter = 1001;

export const getNextOrderId = () => {
  const id = orderCounter;
  orderCounter += 1;
  return id.toString();
};

