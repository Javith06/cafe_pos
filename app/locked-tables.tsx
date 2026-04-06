import { API_URL } from "@/constants/Config";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "../constants/Fonts";
import { setOrderContext } from "../stores/orderContextStore";

const { width: SCREEN_W } = Dimensions.get("window");

type TableType = {
  tableId: string;
  tableNumber: string;
  isLocked?: boolean;
  diningSection?: number;
};

const SECTIONS = ["SECTION_1", "SECTION_2", "SECTION_3", "TAKEAWAY"];
const SECTION_LABELS: Record<string, string> = {
  SECTION_1: "Section 1",
  SECTION_2: "Section 2",
  SECTION_3: "Section 3",
  TAKEAWAY: "Takeaway",
};

export default function LockedTablesScreen() {
  const router = useRouter();
  const [lockedTables, setLockedTables] = useState<TableType[]>([]);
  const [allTables, setAllTables] = useState<TableType[]>([]);
  const [activeSection, setActiveSection] = useState<string>("SECTION_1");
  const [loading, setLoading] = useState(true);
  const [lockingLoading, setLockingLoading] = useState(false);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockModalName, setLockModalName] = useState("");
  const [lockingTableId, setLockingTableId] = useState("");
  const [lockingTableNumber, setLockingTableNumber] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh locked tables when screen comes back into focus
      fetchData();
    }, []),
  );

  const fetchData = async () => {
    try {
      setLoading(true);

      console.log(`🔄 Fetching tables from ${API_URL}/tables...`);

      // Fetch all tables from database
      const tablesRes = await fetch(`${API_URL}/tables`);
      if (!tablesRes.ok) {
        throw new Error(`HTTP ${tablesRes.status}: Failed to fetch tables`);
      }
      const tablesData = await tablesRes.json();
      console.log(
        `📦 Tables response: ${Array.isArray(tablesData) ? tablesData.length : 0} tables`,
      );

      // Fetch locked tables
      const lockedRes = await fetch(`${API_URL}/api/tables/locked`);
      if (!lockedRes.ok) {
        throw new Error(
          `HTTP ${lockedRes.status}: Failed to fetch locked tables`,
        );
      }
      const lockedData = await lockedRes.json();
      const locked = Array.isArray(lockedData) ? lockedData : [];
      console.log(`🔒 Locked tables response: ${locked.length} locked tables`);

      setLockedTables(locked);

      // Convert all tables from API response
      const availableTables: TableType[] = Array.isArray(tablesData)
        ? tablesData.map((table: any) => {
            const tId = table.id || table.TableId;
            const tNum = table.label || table.TableNumber;
            const isLocked = locked.some((t: any) => {
              const lockedId = t.tableId || t.TableId;
              const lockedNum = String(t.tableNumber || t.TableNumber || "");
              // Match by ID first (most reliable), then by table number
              return (
                String(lockedId) === String(tId) || lockedNum === String(tNum)
              );
            });

            console.log(
              `Table ${tNum} (ID: ${tId}): ${isLocked ? "LOCKED" : "AVAILABLE"}`,
            );

            return {
              tableId: tId,
              tableNumber: tNum,
              diningSection: Number(table.DiningSection) || 1,
              isLocked,
            };
          })
        : [];

      console.log(`✅ Loaded ${availableTables.length} tables from database`);
      console.log("📊 Tables by section:", {
        SECTION_1: availableTables.filter(
          (t) => getSectionFromDiningSection(t.diningSection) === "SECTION_1",
        ).length,
        SECTION_2: availableTables.filter(
          (t) => getSectionFromDiningSection(t.diningSection) === "SECTION_2",
        ).length,
        SECTION_3: availableTables.filter(
          (t) => getSectionFromDiningSection(t.diningSection) === "SECTION_3",
        ).length,
      });
      setAllTables(availableTables);
    } catch (err) {
      console.error("❌ Error fetching tables:", err);
      Alert.alert(
        "Error",
        "Failed to fetch tables: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setLoading(false);
    }
  };

  // Map DiningSection number from database to section string
  const getSectionFromDiningSection = (diningSection?: number): string => {
    switch (diningSection) {
      case 1:
        return "SECTION_1";
      case 2:
        return "SECTION_2";
      case 3:
        return "SECTION_3";
      case 4:
        return "TAKEAWAY";
      default:
        return "SECTION_1";
    }
  };

  const continueWithOrder = (tableNumber: string, diningSection?: number) => {
    const section = getSectionFromDiningSection(diningSection);
    setOrderContext({
      orderType: "DINE_IN",
      section: section,
      tableNo: tableNumber,
    });
    router.push("/menu/thai_kitchen");
  };

  const lockTable = (tableId: string, tableNumber: string) => {
    console.log(`🔐 Initiating lock for Table ${tableNumber} (ID: ${tableId})`);
    setLockingTableId(tableId);
    setLockingTableNumber(tableNumber);
    setLockModalName("");
    setLockModalVisible(true);
  };

  const confirmLockTable = async () => {
    try {
      setLockingLoading(true);

      const payload = {
        tableId: lockingTableId,
        lockedByName: lockModalName.trim(),
      };

      console.log("🔒 Lock request payload:", payload);

      const res = await fetch(`${API_URL}/api/tables/lock-persistent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("📥 Lock response:", { status: res.status, data });

      if (res.ok) {
        setLockModalVisible(false);
        setLockingLoading(false);
        Alert.alert(
          "Success",
          `Table ${lockingTableNumber} locked${lockModalName ? ` for ${lockModalName}` : ""}`,
          [{ text: "OK", onPress: () => fetchData() }],
        );
      } else {
        setLockingLoading(false);
        Alert.alert("Error", data.error || "Failed to lock table");
      }
    } catch (err) {
      setLockingLoading(false);
      console.error("❌ Lock error:", err);
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to lock table",
      );
    }
  };

  const unlockTable = async (tableId: string, tableNumber: string) => {
    console.log(`🔓 UNLOCK REQUEST: Table ${tableNumber} (ID: ${tableId})`);

    if (!tableId) {
      console.error("❌ Table ID is missing!");
      Alert.alert("Error", "Table ID is missing. Cannot unlock.");
      return;
    }

    // Validate GUID format
    const guidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidPattern.test(tableId)) {
      console.error("❌ Invalid table ID format:", tableId);
      Alert.alert(
        "Error",
        "Invalid table ID format. Please refresh and try again.",
      );
      return;
    }

    Alert.alert(
      "Unlock Table",
      `Are you sure you want to unlock Table ${tableNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🚀 Sending unlock request to server...");
              console.log("📤 Payload:", { tableId });

              const res = await fetch(
                `${API_URL}/api/tables/unlock-persistent`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tableId }),
                },
              );

              console.log("📥 Unlock response status:", res.status);

              let responseData: any = null;
              let errorMessage = "";

              try {
                responseData = await res.json();
                console.log("📥 Unlock response data:", responseData);
                if (responseData.error) {
                  errorMessage = responseData.error;
                }
              } catch (parseErr) {
                console.error("Failed to parse response as JSON:", parseErr);
                const responseText = await res.text();
                console.log("📥 Unlock response text:", responseText);
                errorMessage = responseText;
              }

              if (res.ok && responseData?.success) {
                console.log(`✅ Table ${tableNumber} unlocked successfully!`);
                console.log(`🔄 Refreshing table data...`);

                // Refresh the data to show updated state
                await fetchData();

                Alert.alert(
                  "Success",
                  `Table ${tableNumber} has been unlocked`,
                  [{ text: "OK" }],
                );
              } else {
                const fullError = errorMessage || `HTTP ${res.status}`;
                console.error("❌ Unlock failed:", {
                  status: res.status,
                  error: fullError,
                });
                Alert.alert(
                  "Unlock Failed",
                  `Failed to unlock table: ${fullError}`,
                );
              }
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              console.error("❌ Unlock error:", errorMsg);
              Alert.alert("Error", `Failed to unlock table: ${errorMsg}`);
            }
          },
        },
      ],
    );
  };

  const sectionTables = React.useMemo(() => {
    const filtered = allTables.filter((t) => {
      const mappedSection = getSectionFromDiningSection(t.diningSection);
      return mappedSection === activeSection;
    });
    console.log(
      `📋 Section ${activeSection}: ${filtered.length} tables, ${filtered.filter((t) => t.isLocked).length} locked`,
    );
    return filtered;
  }, [allTables, activeSection]);

  const renderTableItem = ({ item }: { item: TableType }) => (
    <View style={[styles.tableCard, item.isLocked && styles.lockedCard]}>
      {/* Top bar: unlock button */}
      {item.isLocked && (
        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={() => {
            console.log(
              `👉 [TOUCH] "X" Button Pressed for Table ${item.tableNumber}`,
            );
            console.log(`📋 Table Details:`, {
              tableId: item.tableId,
              tableNumber: item.tableNumber,
              isLocked: item.isLocked,
            });
            unlockTable(item.tableId, item.tableNumber);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={22} color="#f87171" />
        </TouchableOpacity>
      )}
      {/* Main card content */}
      <TouchableOpacity
        style={styles.tableContent}
        onPress={() => {
          if (item.isLocked) {
            Alert.alert(
              "Locked Table",
              `Table ${item.tableNumber} is locked. Continue order processing?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Continue Order",
                  onPress: () =>
                    continueWithOrder(item.tableNumber, item.diningSection),
                },
              ],
            );
          } else {
            lockTable(item.tableId, item.tableNumber);
          }
        }}
      >
        <View style={[styles.tableIcon, item.isLocked && styles.lockedIcon]}>
          <Ionicons
            name={item.isLocked ? "lock-closed" : "lock-open-outline"}
            size={24}
            color={item.isLocked ? "#fbbf24" : "#64748b"}
          />
        </View>
        <Text style={styles.tableNumber}>{item.tableNumber}</Text>
        <Text
          style={[styles.tableStatus, item.isLocked && styles.lockedStatus]}
        >
          {item.isLocked ? "LOCKED" : "AVAILABLE"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageBackground
      source={require("../assets/images/mesh_bg.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Lock Table</Text>
            <Text style={styles.headerSubtitle}>Reserve or manage tables</Text>
          </View>
          <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#4ade80" />
          </TouchableOpacity>
        </View>

        {/* Locked Tables Preview */}
        {lockedTables.length > 0 && (
          <View style={styles.lockedPreviewContainer}>
            <Text style={styles.lockedPreviewTitle}>
              🔒 RESERVED TABLES ({lockedTables.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.lockedTablesScroll}
            >
              {lockedTables.map((table, index) => (
                <View
                  key={`${table.tableId}-${index}`}
                  style={styles.lockedTablePreview}
                >
                  <Ionicons name="lock-closed" size={16} color="#fbbf24" />
                  <Text style={styles.lockedTablePreviewNo}>
                    Table {table.tableNumber}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Section Tabs */}
        <View style={styles.sectionTabs}>
          {SECTIONS.map((section) => (
            <TouchableOpacity
              key={section}
              style={[
                styles.sectionTab,
                activeSection === section && styles.activeSectionTab,
              ]}
              onPress={() => setActiveSection(section)}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === section && styles.activeSectionTabText,
                ]}
              >
                {SECTION_LABELS[section]}
              </Text>
              <View
                style={[
                  styles.sectionTabBadge,
                  activeSection === section && styles.activeSectionTabBadge,
                ]}
              >
                <Text style={styles.sectionTabBadgeText}>
                  {
                    allTables.filter(
                      (t) =>
                        getSectionFromDiningSection(t.diningSection) ===
                          section && t.isLocked,
                    ).length
                  }
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4ade80" />
            <Text style={styles.loadingText}>Loading tables...</Text>
          </View>
        ) : (
          <FlatList
            data={sectionTables}
            keyExtractor={(item) => item.tableId}
            renderItem={renderTableItem}
            numColumns={4}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="grid-outline"
                  size={48}
                  color="rgba(255,255,255,0.1)"
                />
                <Text style={styles.emptyText}>No tables in this section</Text>
              </View>
            }
          />
        )}

        {/* Info Footer */}
        <BlurView intensity={40} tint="dark" style={styles.footer}>
          <View style={styles.infoRow}>
            <View style={styles.infoBadge}>
              <View style={styles.lockedDot} />
              <Text style={styles.infoText}>
                Tap to lock table for reservation
              </Text>
            </View>
            <View style={styles.infoBadge}>
              <View style={styles.availableDot} />
              <Text style={styles.infoText}>
                Tap locked table to continue order
              </Text>
            </View>
          </View>
        </BlurView>

        {/* Lock Table Modal */}
        <Modal
          transparent
          visible={lockModalVisible}
          animationType="slide"
          onRequestClose={() => setLockModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Lock Table {lockingTableNumber}
              </Text>
              <Text style={styles.modalSubtitle}>
                Enter customer or person name (optional)
              </Text>

              <TextInput
                style={styles.nameInput}
                placeholder="Customer Name"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={lockModalName}
                onChangeText={setLockModalName}
                autoFocus
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setLockModalVisible(false)}
                  disabled={lockingLoading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.confirmBtn,
                    lockingLoading && styles.confirmBtnDisabled,
                  ]}
                  onPress={confirmLockTable}
                  disabled={lockingLoading}
                >
                  <Text style={styles.confirmBtnText}>
                    {lockingLoading ? "Locking..." : "Lock Table"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "#64748b",
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    marginTop: 2,
  },
  refreshBtn: {
    marginLeft: "auto",
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.3)",
  },
  sectionTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  activeSectionTab: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.4)",
  },
  sectionTabText: {
    color: "#64748b",
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  activeSectionTabText: {
    color: "#4ade80",
  },
  sectionTabBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 24,
    alignItems: "center",
  },
  activeSectionTabBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.25)",
  },
  sectionTabBadgeText: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94a3b8",
    fontFamily: Fonts.medium,
    fontSize: 14,
    marginTop: 12,
  },
  gridItemContainer: {
    flex: 1,
    margin: 5,
    position: "relative",
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 120,
  },
  gridRow: {
    gap: 10,
    marginBottom: 10,
  },
  tableCard: {
    flex: 1,
    position: "relative",
    borderRadius: 14,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 120,
  },
  lockedCard: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderColor: "rgba(251, 191, 36, 0.35)",
  },
  tableContent: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tableIcon: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
  lockedIcon: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  tableNumber: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  tableStatus: {
    color: "#64748b",
    fontFamily: Fonts.bold,
    fontSize: 10,
    marginTop: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  lockedStatus: {
    color: "#fbbf24",
  },
  unlockBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(248, 113, 113, 0.4)",
    zIndex: 999,
    elevation: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  infoRow: {
    gap: 8,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  lockedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fbbf24",
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#64748b",
  },
  infoText: {
    color: "#94a3b8",
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 14,
    marginTop: 12,
  },
  row: {
    justifyContent: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  tableBtn: {
    flex: 1,
    maxWidth: "31%",
    aspectRatio: 1,
    backgroundColor: "rgba(157, 204, 69, 0.15)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(157, 204, 69, 0.4)",
    padding: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#8bc34a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  tableNumText: {
    fontSize: 22,
    color: "#fff",
    fontFamily: Fonts.black,
  },
  statusText: {
    fontSize: 10,
    color: "#8bc34a",
    fontFamily: Fonts.bold,
    marginTop: 4,
    letterSpacing: 1,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 10,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6f4a7e",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  disabledBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    opacity: 0.5,
  },
  navText: {
    color: "#fff",
    fontFamily: Fonts.bold,
  },
  pageInfo: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    width: "80%",
    maxWidth: 360,
  },
  modalTitle: {
    color: "#4ade80",
    fontFamily: Fonts.black,
    fontSize: 18,
    marginBottom: 8,
  },
  modalSubtitle: {
    color: "#94a3b8",
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginBottom: 18,
  },
  nameInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontFamily: Fonts.medium,
    fontSize: 14,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  cancelBtn: {
    backgroundColor: "rgba(100, 116, 139, 0.15)",
    borderColor: "rgba(100, 116, 139, 0.3)",
  },
  cancelBtnText: {
    color: "#94a3b8",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  confirmBtn: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    borderColor: "rgba(74, 222, 128, 0.4)",
  },
  confirmBtnText: {
    color: "#4ade80",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  /* LOCKED TABLES PREVIEW STYLES */
  lockedPreviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(251, 191, 36, 0.2)",
  },
  lockedPreviewTitle: {
    color: "#fbbf24",
    fontFamily: Fonts.bold,
    fontSize: 12,
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  lockedTablesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  lockedTablePreview: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 120,
  },
  lockedTablePreviewNo: {
    color: "#fbbf24",
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
});
