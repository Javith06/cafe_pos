import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "../../constants/Fonts";
import { API_URL } from "../../constants/Config";

import { useActiveOrdersStore } from "../../stores/activeOrdersStore";
import {
  getContextId,
  setCartItemsGlobal,
  useCartStore,
} from "../../stores/cartStore";
import { getHeldOrders, removeHeldOrder } from "../../stores/heldOrdersStore";
import { setOrderContext } from "../../stores/orderContextStore";
import { useTableStatusStore } from "../../stores/tableStatusStore";

type TableItem = {
  id: string;
  label: string;
  DiningSection: number;
};

const SECTIONS = ["SECTION_1", "SECTION_2", "SECTION_3", "TAKEAWAY"];

const SECTION_LABELS: Record<string, string> = {
  SECTION_1: "Section 1",
  SECTION_2: "Section 2",
  SECTION_3: "Section 3",
  TAKEAWAY: "Takeaway",
};

const SECTION_SHORT: Record<string, string> = {
  SECTION_1: "S1",
  SECTION_2: "S2",
  SECTION_3: "S3",
  TAKEAWAY: "TW",
};

export default function Category() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { section: urlSection } = useLocalSearchParams<{ section?: string }>();

  const [activeTab, setActiveTab] = useState<string>("SECTION_1");
  const [allTables, setAllTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionScrollRef = useRef<ScrollView>(null);

  const tables = useTableStatusStore((s) => s.tables);
  const getLockedName = useTableStatusStore((s) => s.getLockedName);
  const setLockedName = useTableStatusStore((s) => s.setLockedName);
  const activeOrders = useActiveOrdersStore((s) => s.activeOrders);
  const carts = useCartStore((s) => s.carts);

  const isTablet = width >= 768;

  useEffect(() => {
    fetchTables();
    fetchLockedTables();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh locked tables when screen comes back into focus
      fetchLockedTables();
    }, [])
  );

  const fetchLockedTables = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tables/locked`);
      const lockedTables = await response.json();
      
      if (Array.isArray(lockedTables)) {
        lockedTables.forEach((table: any) => {
          const tableNo = table.tableNumber || table.TableNumber;
          const lockedName = table.lockedByName || "";
          if (tableNo) {
            setLockedName(tableNo, lockedName);
          }
        });
      }
    } catch (error) {
      console.error("Failed to fetch locked tables:", error);
    }
  };

  const fetchTables = async () => {
    try {
      console.log(`🔄 Fetching tables from ${API_URL}/tables...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `${API_URL}/tables`,
        { 
          signal: controller.signal,
          headers: { "Accept": "application/json" }
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}:`, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📦 API Response:", data);

      let tablesArray: any[] = [];
      if (Array.isArray(data)) {
        tablesArray = data;
      } else if (data?.data && Array.isArray(data.data)) {
        tablesArray = data.data;
      } else if (data?.recordset && Array.isArray(data.recordset)) {
        tablesArray = data.recordset;
      } else {
        console.warn("⚠️ Unexpected response format:", typeof data);
        tablesArray = [];
      }

      if (tablesArray.length > 0) {
        // Convert database data maintaining the DiningSection mapping
        const convertedData = tablesArray
          .map((item: any) => ({
            id: item.TableId || item.id,
            label: item.TableNumber || item.label,
            DiningSection: Number(item.DiningSection) || 1,
          }))
          .filter((item) => item.id && item.label);

        console.log(`✅ Successfully loaded ${convertedData.length} tables from database`);
        setAllTables(convertedData);
      } else {
        console.error("❌ API returned empty table list");
        throw new Error("No tables returned from API");
      }
    } catch (error) {
      console.error("❌ Critical: Failed to fetch tables from API:", error);
      Alert.alert(
        "Connection Error",
        `Failed to connect to server at ${API_URL}\n\nPlease ensure the backend server is running and accessible.`,
        [{ text: "OK" }]
      );
      setAllTables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlSection && SECTIONS.includes(urlSection)) {
      setActiveTab(urlSection);
    }
  }, [urlSection]);

  // Responsive columns
  let columns = 10;
  if (width < 480) columns = 3;
  else if (width < 768) columns = 4;
  else if (width < 1024) columns = 6;
  else if (width < 1280) columns = 8;
  else if (width < 1920) columns = 10;
  else columns = 12;

  const GAP = 12;
  const PADDING = isTablet ? 24 : 16;
  const availableGridWidth = width - PADDING * 2;
  const itemSize = (availableGridWidth - GAP * (columns - 1)) / columns;

  useEffect(() => {
    const index = SECTIONS.indexOf(activeTab);
    if (index !== -1 && sectionScrollRef.current) {
      sectionScrollRef.current.scrollTo({ x: index * 120, animated: true });
    }
  }, [activeTab]);

  const numberFont = Math.max(12, Math.min(24, itemSize * 0.32));
  const smallFont = Math.max(9, Math.min(14, itemSize * 0.18));

  const currentTables = allTables.filter((table) => {
    if (activeTab === "TAKEAWAY") return table.DiningSection === 4;
    else if (activeTab === "SECTION_1") return table.DiningSection === 1;
    else if (activeTab === "SECTION_2") return table.DiningSection === 2;
    else if (activeTab === "SECTION_3") return table.DiningSection === 3;
    return false;
  });

  // Count occupied tables per section for badge
  const occupiedCount = currentTables.filter((t) => {
    const td = tables.find((st) => st.section === activeTab && st.tableNo === t.label);
    return !!td;
  }).length;

  const renderItem = ({ item }: { item: TableItem }) => {
    const tableData = tables.find(
      (t) => t.section === activeTab && t.tableNo === item.label,
    );

    let borderColor = "rgba(255,255,255,0.12)";
    let bgColor = "rgba(15, 23, 42, 0.6)";
    let timeText = "";
    let orderText = "";
    let billAmount = 0;

    if (tableData) {
      if (tableData.status === "HOLD") {
        const helds = getHeldOrders();
        const held = helds.find((h) => h.orderId === tableData.orderId);
        if (held) {
          billAmount = held.cart.reduce(
            (sum: number, i: any) => sum + (i.price || 0) * i.qty,
            0,
          );
        }
      } else {
        const activeOrder = activeOrders.find(
          (o: any) => o.orderId === tableData.orderId,
        );
        if (activeOrder) {
          billAmount = activeOrder.items.reduce(
            (sum: number, i: any) => sum + (i.price || 0) * i.qty,
            0,
          );
        }
      }

      const contextId = getContextId({
        orderType: activeTab === "TAKEAWAY" ? "TAKEAWAY" : "DINE_IN",
        section: activeTab,
        tableNo: item.label,
        takeawayNo: item.label,
      });

      if (contextId) {
        const cartItems = carts[contextId] || [];
        const cartSubtotal = cartItems.reduce(
          (sum: number, i: any) => sum + (i.price || 0) * i.qty,
          0,
        );
        billAmount += cartSubtotal;
      }

      const elapsedMs = Date.now() - tableData.startTime;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);

      switch (tableData.status) {
        case "LOCKED":
          bgColor = "rgba(251, 191, 36, 0.3)";
          borderColor = "#fbbf24";
          timeText = "RESERVED";
          break;
        case "HOLD":
          bgColor = "rgba(37, 99, 235, 0.55)";
          borderColor = "#60a5fa";
          break;
        case "SENT":
          if (elapsedMinutes >= 60) {
            bgColor = "rgba(220, 38, 38, 0.55)";
            borderColor = "#f87171";
          } else {
            bgColor = "rgba(21, 128, 61, 0.55)";
            borderColor = "#4ade80";
          }
          break;
        case "BILL_REQUESTED":
          bgColor = "rgba(180, 83, 9, 0.55)";
          borderColor = "#fbbf24";
          break;
        default:
          bgColor = "rgba(30, 41, 59, 0.8)";
          borderColor = "rgba(255,255,255,0.15)";
      }

      const time = new Date(tableData.startTime);
      const hours = time.getHours().toString().padStart(2, "0");
      const mins = time.getMinutes().toString().padStart(2, "0");
      if (tableData.status !== "LOCKED") {
        timeText = `${hours}:${mins}`;
        orderText = `#${tableData.orderId}`;
      }
    }

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.tableBox,
          {
            width: itemSize,
            height: itemSize,
            borderColor,
            backgroundColor: bgColor,
          },
        ]}
        onPress={() => {
          // Prevent interaction with locked tables
          if (tableData && tableData.status === "LOCKED") {
            Alert.alert("Table Locked", "This table is reserved. Visit Lock Tables to unlock it.", [
              { text: "Go to Lock Tables", onPress: () => router.push("/locked-tables") },
              { text: "Cancel", style: "cancel" },
            ]);
            return;
          }

          let newContext: any;
          if (activeTab === "TAKEAWAY") {
            newContext = {
              orderType: "TAKEAWAY" as const,
              takeawayNo: item.label,
            };
          } else {
            newContext = {
              orderType: "DINE_IN" as const,
              section: activeTab,
              tableNo: item.label,
            };
          }

          setOrderContext(newContext);

          if (tableData && tableData.status === "HOLD") {
            const helds = getHeldOrders();
            const held = helds.find((h) => h.orderId === tableData.orderId);
            if (held) {
              const contextId = getContextId(newContext);
              if (contextId) {
                setCartItemsGlobal(contextId, held.cart);
              }
              removeHeldOrder(held.id);
            }
          }

          router.push("/menu/thai_kitchen");
        }}
      >
        <View style={styles.tableContent}>
          <Text style={[styles.tableNumber, { fontSize: numberFont }]}>
            {item.label}
          </Text>
          {tableData && tableData.status !== "LOCKED" && (
            <View style={styles.tableInfo}>
              <Text style={[styles.timeText, { fontSize: smallFont }]}>
                {timeText}
              </Text>
              <Text style={[styles.orderText, { fontSize: smallFont }]}>
                {orderText}
              </Text>
              <Text style={[styles.billText, { fontSize: smallFont + 1 }]}>
                ${billAmount.toFixed(2)}
              </Text>
            </View>
          )}
          {tableData && tableData.status === "LOCKED" && (
            <View style={styles.lockedOverlay}>
              <Ionicons name="lock-closed" size={20} color="#fbbf24" />
              <Text style={[styles.timeText, { fontSize: smallFont }]}>RESERVED</Text>
              {getLockedName(item.label) && (
                <Text style={[styles.lockedNameText, { fontSize: smallFont - 1 }]}>
                  {getLockedName(item.label)}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>Loading floor plan...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require("../../assets/images/mesh_bg.png")}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Darker overlay for readability */}
        <View style={styles.overlay} />

        {/* ═══════════ TOP NAV BAR ═══════════ */}
        <BlurView
          intensity={50}
          tint="dark"
          style={[
            styles.topNavContainer,
            { paddingHorizontal: isTablet ? 20 : 14 },
          ]}
        >
          {/* LEFT — Branding (Removed) */}
          <View style={{ width: 0 }} />

          {/* CENTER — Section Tabs */}
          <ScrollView
            ref={sectionScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
            style={styles.tabsScrollView}
          >
            <View style={[styles.tabsWrapper, { gap: isTablet ? 6 : 4 }]}>
              {SECTIONS.map((section) => {
                const isActive = activeTab === section;
                const sectionTables = allTables.filter((t) => {
                  if (section === "TAKEAWAY") return t.DiningSection === 3 || t.DiningSection === 4;
                  if (section === "SECTION_1") return t.DiningSection === 1;
                  if (section === "SECTION_2") return t.DiningSection === 2;
                  if (section === "SECTION_3") return t.DiningSection === 3;
                  return false;
                });
                const occupied = sectionTables.filter((t) =>
                  tables.some((st) => st.section === section && st.tableNo === t.label)
                ).length;

                return (
                  <TouchableOpacity
                    key={section}
                    onPress={() => setActiveTab(section)}
                    activeOpacity={0.75}
                    style={[
                      styles.tabBtn,
                      isActive && styles.activeTabBtn,
                    ]}
                  >
                    {/* Short code badge */}
                    <View style={[styles.tabCodeBadge, isActive && styles.activeTabCodeBadge]}>
                      <Text style={[styles.tabCodeText, isActive && styles.activeTabCodeText]}>
                        {SECTION_SHORT[section]}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.tabText,
                        isActive && styles.activeTabText,
                        { fontSize: isTablet ? 13 : 11 },
                      ]}
                    >
                      {SECTION_LABELS[section]}
                    </Text>
                    {occupied > 0 && (
                      <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                        <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                          {occupied}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* RIGHT — Action Buttons */}
          <View style={[styles.navRightGroup, { gap: isTablet ? 8 : 6 }]}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => router.push("/members")}
              activeOpacity={0.75}
            >
              <Ionicons name="people-outline" size={16} color="#3b82f6" />
              {isTablet && (
                <Text style={[styles.headerActionText, { color: "#3b82f6" }]}>Members</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => router.push("/locked-tables")}
              activeOpacity={0.75}
            >
              <Ionicons name="lock-closed-outline" size={16} color="#f59e0b" />
              {isTablet && (
                <Text style={[styles.headerActionText, { color: "#f59e0b" }]}>Lock Tables</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerActionBtn, styles.salesBtn]}
              onPress={() => router.push("/sales-report")}
              activeOpacity={0.75}
            >
              <Ionicons name="bar-chart-outline" size={16} color="#4ade80" />
              {isTablet && (
                <Text style={[styles.headerActionText, { color: "#4ade80" }]}>Sales</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerActionBtn, styles.logoutBtn]}
              onPress={() => router.replace("/")}
              activeOpacity={0.75}
            >
              <Ionicons name="log-out-outline" size={16} color="#f87171" />
              {isTablet && (
                <Text style={[styles.headerActionText, { color: "#f87171" }]}>Logout</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* ═══════════ SECTION HEADER ═══════════ */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionHeaderTitle}>
              {SECTION_LABELS[activeTab]}
            </Text>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>
                {currentTables.length} tables
              </Text>
            </View>
            {occupiedCount > 0 && (
              <View style={styles.occupiedBadge}>
                <View style={styles.occupiedDot} />
                <Text style={styles.occupiedText}>{occupiedCount} occupied</Text>
              </View>
            )}
          </View>
        </View>

        {/* ═══════════ TABLE GRID ═══════════ */}
        <FlatList
          data={currentTables}
          key={columns}
          numColumns={columns}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            gap: GAP,
            paddingHorizontal: PADDING,
            paddingBottom: 50,
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="grid-outline" size={48} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>No tables found</Text>
              <TouchableOpacity onPress={fetchTables} style={styles.retryBtn}>
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.retryText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000" },
  background: { flex: 1, width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  /* ── Loading ── */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#080c14",
  },
  loadingText: {
    color: "#94a3b8",
    marginTop: 12,
    fontFamily: Fonts.medium,
    fontSize: 15,
  },

  /* ── Top Nav ── */
  topNavContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "rgba(5, 8, 20, 0.7)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },

  /* Brand */
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingRight: 4,
  },
  brandIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    color: "#f1f5f9",
    fontFamily: Fonts.black,
    fontSize: 14,
    lineHeight: 17,
  },
  brandSub: {
    color: "#4ade80",
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },

  /* Tabs */
  tabsScrollView: { flex: 1 },
  tabsScrollContent: { alignItems: "center", paddingHorizontal: 4 },
  tabsWrapper: { flexDirection: "row", alignItems: "center" },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  activeTabBtn: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.4)",
  },
  tabText: {
    color: "#64748b",
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.2,
  },
  activeTabText: { color: "#22c55e", fontFamily: Fonts.extraBold },

  /* Code badge inside tab (S1, S2, S3, TW) */
  tabCodeBadge: {
    width: 21,
    height: 18,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  activeTabCodeBadge: {
    backgroundColor: "#22c55e",
  },
  tabCodeText: {
    color: "#64748b",
    fontFamily: Fonts.black,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  activeTabCodeText: {
    color: "#052b12",
  },

  tabBadge: {
    marginLeft: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  activeTabBadge: { backgroundColor: "rgba(34,197,94,0.25)" },
  tabBadgeText: {
    color: "#94a3b8",
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  activeTabBadgeText: { color: "#22c55e" },

  /* Right Action Buttons */
  navRightGroup: { flexDirection: "row", alignItems: "center" },
  headerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  salesBtn: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.2)",
  },
  logoutBtn: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.2)",
  },
  headerActionText: {
    color: "#94a3b8",
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },

  /* ── Section Header Row ── */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionAccentBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#22c55e",
  },
  sectionHeaderTitle: {
    color: "#f1f5f9",
    fontFamily: Fonts.extraBold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  sectionCountBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sectionCountText: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
  occupiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  occupiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  occupiedText: {
    color: "#4ade80",
    fontFamily: Fonts.semiBold,
    fontSize: 11,
  },

  /* ── Table Card ── */
  tableBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
  },
  statusPill: {
    position: "absolute",
    top: 5,
    right: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
  tableContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  tableNumber: {
    fontFamily: Fonts.black,
    color: "#fff",
    marginBottom: 2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tableInfo: { alignItems: "center", gap: 1 },
  timeText: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: Fonts.medium,
  },
  orderText: { color: "rgba(255,255,255,0.6)", fontFamily: Fonts.regular },
  billText: {
    color: "#fff",
    fontFamily: Fonts.black,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  lockedOverlay: {
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  lockedNameText: {
    color: "#fbbf24",
    fontFamily: Fonts.semiBold,
    marginTop: 2,
  },

  /* ── Empty State ── */
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
    gap: 12,
  },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
    marginBottom: 4,
    fontFamily: Fonts.medium,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  retryText: { color: "#4ade80", fontFamily: Fonts.bold, fontSize: 14 },
});
