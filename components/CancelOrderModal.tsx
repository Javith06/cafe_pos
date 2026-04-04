import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Fonts } from "../constants/Fonts";
import { API_URL } from "@/constants/Config";

type CancelReason = {
  CRCode: string;
  CRName: string;
  SortCode: number;
};

interface CancelOrderModalProps {
  visible: boolean;
  settlementId: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  visible,
  settlementId,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [reasons, setReasons] = useState<CancelReason[]>([]);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      fetchCancelReasons();
    }
  }, [visible]);

  const fetchCancelReasons = async () => {
    setLoadingReasons(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/cancel-reasons`);
      const data = await response.json();
      setReasons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching cancel reasons:", err);
      setError("Failed to load cancellation reasons");
    } finally {
      setLoadingReasons(false);
    }
  };

  const handleConfirm = () => {
    const reason = selectedReason === "other" ? customReason : selectedReason;

    if (!reason || reason.trim() === "") {
      setError("Please select or enter a reason");
      return;
    }

    onConfirm(reason);
    handleClose();
  };

  const handleClose = () => {
    setSelectedReason(null);
    setCustomReason("");
    setError("");
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={90} style={styles.blur}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Cancel Order</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.label}>Select Cancellation Reason:</Text>

              {loadingReasons ? (
                <ActivityIndicator size="large" color="#22c55e" />
              ) : (
                <>
                  <FlatList
                    data={reasons}
                    keyExtractor={(item) => item.CRCode}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.reasonOption,
                          selectedReason === item.CRName && styles.reasonSelected,
                        ]}
                        onPress={() => {
                          setSelectedReason(item.CRName);
                          setError("");
                        }}
                      >
                        <View style={styles.checkbox}>
                          {selectedReason === item.CRName && (
                            <Ionicons name="checkmark" size={16} color="#22c55e" />
                          )}
                        </View>
                        <Text style={styles.reasonText}>{item.CRName}</Text>
                      </TouchableOpacity>
                    )}
                  />

                  {/* Other Option */}
                  <TouchableOpacity
                    style={[
                      styles.reasonOption,
                      selectedReason === "other" && styles.reasonSelected,
                    ]}
                    onPress={() => {
                      setSelectedReason("other");
                      setError("");
                    }}
                  >
                    <View style={styles.checkbox}>
                      {selectedReason === "other" && (
                        <Ionicons name="checkmark" size={16} color="#22c55e" />
                      )}
                    </View>
                    <Text style={styles.reasonText}>Other</Text>
                  </TouchableOpacity>

                  {selectedReason === "other" && (
                    <TextInput
                      placeholder="Enter reason..."
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.input}
                      value={customReason}
                      onChangeText={(text) => {
                        setCustomReason(text);
                        setError("");
                      }}
                      multiline
                      maxLength={200}
                    />
                  )}
                </>
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, isLoading && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={isLoading || !selectedReason}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  modal: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: "#fff",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: "60%",
  },
  label: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: "#fff",
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  reasonSelected: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: "#fff",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    color: "#fff",
    fontFamily: Fonts.regular,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 12,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "rgba(239, 68, 68, 0.5)",
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
});
