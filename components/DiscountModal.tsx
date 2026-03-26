import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useActiveOrdersStore } from "../stores/activeOrdersStore";
import { useCartStore } from "../stores/cartStore";
import { getOrderContext } from "../stores/orderContextStore";

export default function DiscountModal({
  visible,
  onClose,
  currentTotal,
}: {
  visible: boolean;
  onClose: () => void;
  currentTotal: number;
}) {
  const applyDiscount = useCartStore((s) => s.applyDiscount);

  const updateOrderDiscount = useActiveOrdersStore(
    (s) => s.updateOrderDiscount,
  );

  const context = getOrderContext();

  if (!context) {
    console.log("❌ No context found when applying discount");
  }

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage",
  );

  const [inputValue, setInputValue] = useState("");
  const [previewDiscount, setPreviewDiscount] = useState(0);

  const quickPercentages = [5, 10, 15, 20, 25, 50];
  const quickFixed = [5, 10, 20, 50, 100];

  /* ================= PREVIEW ================= */

  useEffect(() => {
    const value = parseFloat(inputValue);

    if (!value || isNaN(value)) {
      setPreviewDiscount(0);
      return;
    }

    let discount = 0;

    if (discountType === "percentage") {
      discount = (currentTotal * value) / 100;
      if (value > 100) discount = currentTotal;
    } else {
      discount = value;
      if (value > currentTotal) discount = currentTotal;
    }

    setPreviewDiscount(discount);
  }, [inputValue, discountType, currentTotal]);

  /* ================= APPLY ================= */

  const handleApply = () => {
    const value = parseFloat(inputValue);

    if (!value || isNaN(value) || value <= 0) {
      alert("Enter valid discount");
      return;
    }

    const discountData = {
      applied: true,
      type: discountType,
      value,
    };

    // update cart
    applyDiscount(discountData);

    // 🔥 GET FRESH CONTEXT HERE
    const currentContext = getOrderContext();

    if (currentContext) {
      updateOrderDiscount(currentContext, discountData);
    } else {
      console.log("❌ Context missing during discount apply");
    }

    setInputValue("");
    setDiscountType("percentage");

    onClose();
  };
  /* ================= CANCEL ================= */

  const handleCancel = () => {
    setInputValue("");
    setDiscountType("percentage");
    setPreviewDiscount(0);
    onClose();
  };

  /* ================= UI ================= */

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Apply Discount</Text>

          {/* TYPE SWITCH */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                discountType === "percentage" && styles.active,
              ]}
              onPress={() => setDiscountType("percentage")}
            >
              <Text style={styles.toggleText}>%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                discountType === "fixed" && styles.active,
              ]}
              onPress={() => setDiscountType("fixed")}
            >
              <Text style={styles.toggleText}>$</Text>
            </TouchableOpacity>
          </View>

          {/* QUICK BUTTONS */}
          <View style={styles.quickRow}>
            {(discountType === "percentage"
              ? quickPercentages
              : quickFixed
            ).map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.quickBtn}
                onPress={() => setInputValue(val.toString())}
              >
                <Text style={styles.quickText}>
                  {val}
                  {discountType === "percentage" ? "%" : "$"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* INPUT */}
          <TextInput
            style={styles.input}
            placeholder="Enter value"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={inputValue}
            onChangeText={setInputValue}
          />

          {/* PREVIEW */}
          <Text style={styles.preview}>
            Discount: ${previewDiscount.toFixed(2)}
          </Text>

          {/* BUTTONS */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelBtn]}
              onPress={handleCancel}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.applyBtn]}
              onPress={handleApply}
            >
              <Text style={styles.buttonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    width: "85%",
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 20,
  },

  title: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },

  toggleRow: {
    flexDirection: "row",
    marginBottom: 12,
  },

  toggleBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#333",
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 5,
  },

  active: {
    backgroundColor: "#22c55e",
  },

  toggleText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  quickBtn: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  quickText: {
    color: "#fff",
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#333",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    marginBottom: 10,
  },

  preview: {
    color: "#fff",
    marginBottom: 15,
    textAlign: "center",
  },

  buttonRow: {
    flexDirection: "row",
  },

  button: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },

  cancelBtn: {
    backgroundColor: "#444",
  },

  applyBtn: {
    backgroundColor: "#22c55e",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
