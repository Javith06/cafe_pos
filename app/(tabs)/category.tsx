import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useActiveOrdersStore } from "../../stores/activeOrdersStore";
import { getContextId, setCartItemsGlobal, useCartStore } from "../../stores/cartStore";
import { getHeldOrders, removeHeldOrder } from "../../stores/heldOrdersStore";
import { setOrderContext } from "../../stores/orderContextStore";
import { useTableStatusStore } from "../../stores/tableStatusStore";

type TableItem = {
  id: string;
  label: string;
  DiningSection: number;
};

const SECTIONS = ["SECTION_1", "SECTION_2", "SECTION_3", "TAKEAWAY"];

// 🔥 FALLBACK DATA - If API fails
const getFallbackTables = (): TableItem[] => {
  const tables: TableItem[] = [];
  // SECTION 1: Tables 1-15
  for (let i = 1; i <= 15; i++) {
    tables.push({ id: `fb-${i}`, label: `${i}`, DiningSection: 1 });
  }
  // SECTION 2: Tables 16-30
  for (let i = 16; i <= 30; i++) {
    tables.push({ id: `fb-${i}`, label: `${i}`, DiningSection: 2 });
  }
  // SECTION 3: Tables 31-40
  for (let i = 31; i <= 40; i++) {
    tables.push({ id: `fb-${i}`, label: `${i}`, DiningSection: 3 });
  }
  // TAKEAWAY: T1-T20
  for (let i = 1; i <= 20; i++) {
    tables.push({ id: `fb-T${i}`, label: `T${i}`, DiningSection: 4 });
  }
  // D1-D20
  for (let i = 1; i <= 20; i++) {
    tables.push({ id: `fb-D${i}`, label: `D${i}`, DiningSection: 3 });
  }
  return tables;
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
  const activeOrders = useActiveOrdersStore((s) => s.activeOrders);
  const carts = useCartStore((s) => s.carts);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      console.log("🔄 Fetching tables...");
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch("https://cafepos-production-3428.up.railway.app/tables", {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      let tablesArray: any[] = [];
      if (Array.isArray(data)) {
        tablesArray = data;
      } else if (data?.data && Array.isArray(data.data)) {
        tablesArray = data.data;
      } else if (data?.recordset && Array.isArray(data.recordset)) {
        tablesArray = data.recordset;
      }
      
      if (tablesArray.length > 0) {
        const convertedData = tablesArray.map((item: any) => ({
          id: item.id || item.TableId,
          label: item.label || item.TableNumber,
          DiningSection: Number(item.DiningSection)
        })).filter(item => item.id && item.label);
        
        console.log("✅ API tables loaded:", convertedData.length);
        setAllTables(convertedData);
      } else {
        throw new Error("No data from API");
      }
      
    } catch (error) {
      console.log("⚠️ Using fallback tables");
      const fallbackData = getFallbackTables();
      setAllTables(fallbackData);
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
  const PADDING = width > 768 ? 24 : 16;
  const availableGridWidth = width - PADDING * 2;
  const itemSize = (availableGridWidth - GAP * (columns - 1)) / columns;

  useEffect(() => {
    const index = SECTIONS.indexOf(activeTab);
    if (index !== -1 && sectionScrollRef.current) {
      sectionScrollRef.current.scrollTo({ x: index * 100, animated: true });
    }
  }, [activeTab]);

  const numberFont = Math.max(12, Math.min(24, itemSize * 0.32));
  const smallFont = Math.max(9, Math.min(18, itemSize * 0.2));
  const tabFont = width > 768 ? 16 : 14;

  const currentTables = allTables.filter((table) => {
    if (activeTab === "TAKEAWAY") {
      return table.DiningSection === 3 || table.DiningSection === 4;
    } else if (activeTab === "SECTION_1") {
      return table.DiningSection === 1;
    } else if (activeTab === "SECTION_2") {
      return table.DiningSection === 2;
    } else if (activeTab === "SECTION_3") {
      return table.DiningSection === 3;
    }
    return false;
  });

  const renderItem = ({ item }: { item: TableItem }) => {
    const tableData = tables.find(
      (t) => t.section === activeTab && t.tableNo === item.label
    );

    let borderColor = "rgba(255,255,255,0.25)";
    let bgColor = "rgba(255,255,255,0.05)";
    let timeText = "";
    let orderText = "";
    let billAmount = 0;

    if (tableData) {
      if (tableData.status === "HOLD") {
        const helds = getHeldOrders();
        const held = helds.find((h) => h.orderId === tableData.orderId);
        if (held) {
          billAmount = held.cart.reduce((sum: number, i: any) => sum + (i.price || 0) * i.qty, 0);
        }
      } else {
        const activeOrder = activeOrders.find((o: any) => o.orderId === tableData.orderId);
        if (activeOrder) {
          billAmount = activeOrder.items.reduce((sum: number, i: any) => sum + (i.price || 0) * i.qty, 0);
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
          0
        );
        billAmount += cartSubtotal;
      }

      const elapsedMs = Date.now() - tableData.startTime;
      const minutes = Math.floor(elapsedMs / 60000);

      switch (tableData.status) {
        case "HOLD":
          bgColor = "rgba(37, 99, 235, 0.7)";
          borderColor = "#60a5fa";
          break;
        case "SENT":
          if (minutes >= 60) {
            bgColor = "rgba(220, 38, 38, 0.7)";
            borderColor = "#f87171";
          } else {
            bgColor = "rgba(21, 128, 61, 0.7)";
            borderColor = "#4ade80";
          }
          break;
        case "BILL_REQUESTED":
          bgColor = "rgba(180, 83, 9, 0.7)";
          borderColor = "#fbbf24";
          break;
        default:
          bgColor = "rgba(30, 41, 59, 0.8)";
          borderColor = "rgba(255,255,255,0.25)";
      }

      const time = new Date(tableData.startTime);
      const hours = time.getHours().toString().padStart(2, "0");
      const mins = time.getMinutes().toString().padStart(2, "0");
      timeText = `${hours}:${mins}`;
      orderText = `#${tableData.orderId}`;
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
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
          {tableData && (
            <View style={styles.tableInfo}>
              <Text style={[styles.timeText, { fontSize: smallFont }]}>{timeText}</Text>
              <Text style={[styles.orderText, { fontSize: smallFont }]}>{orderText}</Text>
              <Text style={[styles.billText, { fontSize: smallFont + 1 }]}>
                ₹{billAmount.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a7f3d0" />
        <Text style={styles.loadingText}>Loading tables...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require("../../assets/images/a4.jpg")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <BlurView intensity={35} tint="dark" style={[styles.topNavContainer, { paddingHorizontal: width > 768 ? 24 : 16 }]}>
          <ScrollView
            ref={sectionScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            <View style={[styles.tabsWrapper, { gap: width > 768 ? 16 : 10 }]}>
              {SECTIONS.map((section) => (
                <TouchableOpacity
                  key={section}
                  onPress={() => setActiveTab(section)}
                  style={[
                    styles.tabBtn,
                    activeTab === section && styles.activeTabBtn,
                    { paddingHorizontal: width > 768 ? 24 : 16, paddingVertical: width > 768 ? 12 : 10 }
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === section && styles.activeTabText,
                      { fontSize: tabFont }
                    ]}
                  >
                    {section.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.navRightGroup, { gap: width > 768 ? 12 : 8 }]}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => router.push("/TimeEntry")}
            >
              <Text style={styles.headerActionText}>Time Entry</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.headerActionBtn, styles.salesBtn]}
              onPress={() => router.push("/sales-report")}
            >
              <Text style={styles.headerActionText}>Sales</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.headerActionBtn, styles.logoutBtn]}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.headerActionText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        <FlatList
          data={currentTables}
          key={columns}
          numColumns={columns}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            gap: GAP,
            padding: PADDING,
            paddingBottom: 50,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tables found</Text>
              <TouchableOpacity onPress={fetchTables} style={styles.retryBtn}>
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
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  loadingText: { color: "#fff", marginTop: 10 },
  topNavContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  tabsWrapper: { flexDirection: "row" },
  tabsScrollContent: { alignItems: "center", paddingHorizontal: 8 },
  tabBtn: { borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 4 },
  activeTabBtn: { backgroundColor: "rgba(167,243,208,0.2)" },
  tabText: { color: "#e5e7eb" },
  activeTabText: { color: "#a7f3d0" },
  navRightGroup: { flexDirection: "row" },
  headerActionBtn: { borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", marginLeft: 8, paddingHorizontal: 16, paddingVertical: 10 },
  salesBtn: { backgroundColor: "rgba(46, 204, 113, 0.3)" },
  logoutBtn: { backgroundColor: "rgba(239,68,68,0.3)" },
  headerActionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  tableBox: { borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  tableContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 8 },
  tableNumber: { fontWeight: "900", color: "#fff", marginBottom: 2 },
  tableInfo: { alignItems: "center" },
  timeText: { color: "#fff", fontWeight: "600" },
  orderText: { color: "#fff", fontWeight: "700" },
  billText: { color: "#fff", fontWeight: "900" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 50 },
  emptyText: { color: "#fff", fontSize: 16, marginBottom: 20 },
  retryBtn: { backgroundColor: "#2ecc71", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "bold" },
});