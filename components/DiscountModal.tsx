import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { useActiveOrdersStore } from "../stores/activeOrdersStore";
import { useCartStore } from "../stores/cartStore";
import { getOrderContext } from "../stores/orderContextStore";
import { API_URL } from "@/constants/Config";

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
  const updateOrderDiscount = useActiveOrdersStore((s) => s.updateOrderDiscount);
  const context = getOrderContext();

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [inputValue, setInputValue] = useState("");
  const [previewDiscount, setPreviewDiscount] = useState(0);
  const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);

  const quickPercentages = [5, 10, 15, 20, 25, 50];
  const quickFixed = [5, 10, 20, 50, 75, 100];

  /* ================= FETCH AVAILABLE DISCOUNTS ================= */
  useEffect(() => {
    if (!visible) return;

    const fetchDiscounts = async () => {
      try {
        setLoadingDiscounts(true);
        const response = await fetch(`${API_URL}/api/discounts`);
        const data = await response.json();
        setAvailableDiscounts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching discounts:", err);
        setAvailableDiscounts([]);
      } finally {
        setLoadingDiscounts(false);
      }
    };

    fetchDiscounts();
  }, [visible]);

  /* ================= PREVIEW ================= */
  useEffect(() => {
    if (!visible) return; // Only calculate if visible
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
  }, [inputValue, discountType, currentTotal, visible]);

  /* ================= APPLY ================= */
  const handleApply = () => {
    const value = parseFloat(inputValue);

    if (!value || isNaN(value) || value <= 0) {
      alert("Please enter a valid discount value.");
      return;
    }

    const discountData = {
      applied: true,
      type: discountType,
      value: value,
    };

    applyDiscount(discountData);

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

  /* ================= INPUT VALIDATION ================= */
  const handleInputChange = (text: string) => {
    // Strip everything except digits and the decimal point
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setInputValue(cleaned);
  };

  /* ================= UI ================= */
  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="pricetag" size={20} color="#9ef01a" />
                </View>
                <Text style={styles.title}>Apply Discount</Text>
              </View>
              <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            {/* SEGMENTED CONTROL */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentBtn, discountType === "percentage" && styles.segmentActive]}
                onPress={() => {
                  setDiscountType("percentage");
                  setInputValue("");
                }}
              >
                <Text style={[styles.segmentText, discountType === "percentage" && styles.segmentTextActive]}>
                  Percentage (%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, discountType === "fixed" && styles.segmentActive]}
                onPress={() => {
                  setDiscountType("fixed");
                  setInputValue("");
                }}
              >
                <Text style={[styles.segmentText, discountType === "fixed" && styles.segmentTextActive]}>
                  Fixed Amount ($)
                </Text>
              </TouchableOpacity>
            </View>

            {/* QUICK PRESETS */}
            <Text style={styles.sectionLabel}>Quick Select</Text>
            <View style={styles.quickRow}>
              {(discountType === "percentage" ? quickPercentages : quickFixed).map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.quickBtn, 
                    inputValue === val.toString() && styles.quickBtnActive
                  ]}
                  onPress={() => setInputValue(val.toString())}
                >
                  <Text style={[
                    styles.quickText,
                    inputValue === val.toString() && styles.quickTextActive
                  ]}>
                    {discountType === "fixed" ? "$" : ""}{val}{discountType === "percentage" ? "%" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* AVAILABLE DISCOUNTS FROM DB */}
            {availableDiscounts.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Available Promotions</Text>
                {loadingDiscounts ? (
                  <ActivityIndicator color="#4ade80" style={{ marginVertical: 12 }} />
                ) : (
                  <ScrollView style={styles.availableDiscountsScroll} horizontal showsHorizontalScrollIndicator={false}>
                    {availableDiscounts.map((discount, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.discountCard}
                        onPress={() => {
                          setDiscountType("fixed");
                          setInputValue((discount.Discountprice || 0).toString());
                        }}
                      >
                        <Text style={styles.discountCardLabel}>${discount.Discountprice || 0}</Text>
                        <Text style={styles.discountCardSmall}>on {discount.DiscountQty} qty</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}

            {/* CUSTOM INPUT */}
            <Text style={styles.sectionLabel}>Custom Value</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>
                {discountType === "fixed" ? "$" : "%"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#52525b"
                keyboardType="decimal-pad"
                value={inputValue}
                onChangeText={handleInputChange}
                maxLength={8}
                returnKeyType="done"
              />
            </View>

            {/* HIGHLIGHTED PREVIEW */}
            {previewDiscount > 0 && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Total Discount:</Text>
                <Text style={styles.previewValue}>-${previewDiscount.toFixed(2)}</Text>
              </View>
            )}

            {/* ACTION BUTTONS */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelActionBtn} onPress={handleCancel}>
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.applyBtn, previewDiscount <= 0 && { opacity: 0.5 }]} 
                onPress={handleApply}
                disabled={previewDiscount <= 0}
              >
                <Text style={styles.applyBtnText}>Apply Discount</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
    </Modal>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 380, // Limits width on tablets to be smaller and less overwhelming
    backgroundColor: "#18181b",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(158, 240, 26, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#27272a",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: "#3f3f46",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    color: "#a1a1aa",
    fontWeight: "700",
    fontSize: 14,
  },
  segmentTextActive: {
    color: "#fff",
  },

  // Presets
  sectionLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 20,
  },
  quickBtn: {
    width: "31%", // Keeps them aligned neatly in a grid instead of stretching unevenly
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  quickBtnActive: {
    backgroundColor: "rgba(158, 240, 26, 0.15)",
    borderColor: "rgba(158, 240, 26, 0.4)",
  },
  quickText: {
    color: "#e4e4e7",
    fontWeight: "800",
    fontSize: 15,
  },
  quickTextActive: {
    color: "#9ef01a",
  },

  // Input
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 20,
  },
  inputPrefix: {
    color: "#a1a1aa",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    height: "100%",
  },

  // Preview
  previewContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(158, 240, 26, 0.15)",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(158, 240, 26, 0.3)",
    marginBottom: 20,
  },
  previewLabel: {
    color: "#d7ff9a",
    fontSize: 14,
    fontWeight: "700",
  },
  previewValue: {
    color: "#9ef01a",
    fontSize: 20,
    fontWeight: "900",
  },

  // Actions
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cancelActionBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  applyBtn: {
    flex: 2,
    backgroundColor: "#22c55e",
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  applyBtnText: {
    color: "#052b12",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Available Discounts
  availableDiscountsScroll: {
    marginBottom: 20,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  discountCard: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    minWidth: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  discountCardLabel: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "900",
  },
  discountCardSmall: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 4,
  },
});

