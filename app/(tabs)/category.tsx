import { Ionicons } from "@expo/vector-icons";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useActiveOrdersStore } from "../../stores/activeOrdersStore";
import { getContextId, useCartStore } from "../../stores/cartStore";
import { setOrderContext } from "../../stores/orderContextStore";
import { getTables } from "../../stores/tableStatusStore";

type TableItem = {
  id: string;
  label: string;
};

const DINE_IN_TABLES: TableItem[] = [
  ...Array.from({ length: 35 }, (_, i) => ({
    id: `${i + 1}`,
    label: `${i + 1}`,
  })),
  { id: "36", label: "18-A" },
  { id: "37", label: "19-A" },
  { id: "38", label: "20-A" },
  { id: "39", label: "21-A" },
  { id: "40", label: "22-A" },
];

const TAKEAWAY_TABLES: TableItem[] = [
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `T${i + 1}`,
    label: `T${i + 1}`,
  })),
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `D${i + 1}`,
    label: `D${i + 1}`,
  })),
];

const SECTIONS = ["SECTION_1", "SECTION_2", "SECTION_3", "TAKEAWAY"];

export default function Category() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { section: urlSection } = useLocalSearchParams<{ section?: string }>();

  const [activeTab, setActiveTab] = useState<string>("SECTION_1");
  const sectionScrollRef = useRef<ScrollView>(null);

  const [, forceUpdate] = useState(0);

  const carts = useCartStore((state) => state.carts);

  useEffect(() => {
    if (urlSection && SECTIONS.includes(urlSection)) {
      setActiveTab(urlSection);
    }
  }, [urlSection]);

  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate((v) => v + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  let columns = 10;
  if (width < 600) columns = 4;
  else if (width < 900) columns = 5;
  else if (width < 1200) columns = 8;
  else columns = 10;

  const GAP = 12;
  const PADDING = 20;

  const availableGridWidth = width - PADDING * 2;
  const itemSize = (availableGridWidth - GAP * (columns - 1)) / columns;

  useEffect(() => {
    const index = SECTIONS.indexOf(activeTab);
    if (index !== -1 && sectionScrollRef.current) {
      sectionScrollRef.current.scrollTo({ x: index * 100, animated: true });
    }
  }, [activeTab]);

  const numberFont = Math.max(12, Math.min(22, itemSize * 0.32));
  const smallFont = Math.max(9, Math.min(16, itemSize * 0.18));

  const currentTables =
    activeTab === "TAKEAWAY" ? TAKEAWAY_TABLES : DINE_IN_TABLES;

  const renderItem = ({ item }: { item: TableItem }) => {
    const tables = getTables();
    const activeOrders = useActiveOrdersStore.getState().activeOrders;

    const tableData = tables.find(
      (t) => t.section === activeTab && t.tableNo === item.label,
    );

    let borderColor = "rgba(255,255,255,0.25)";
    let bgColor = "rgba(255,255,255,0.05)";
    let timeText = "";
    let orderText = "";
    let billAmount = 0;
    let minutes = 0;

    let statusIcon: any = null;
    let statusColor = "#fff";

    if (tableData) {
      const activeOrder = activeOrders.find(
        (o: any) =>
          o.context.orderType ===
            (activeTab === "TAKEAWAY" ? "TAKEAWAY" : "DINE_IN") &&
          (activeTab === "TAKEAWAY"
            ? o.context.takeawayNo === item.label
            : o.context.section === activeTab &&
              o.context.tableNo === item.label),
      );

      if (activeOrder) {
        billAmount = activeOrder.items.reduce(
          (sum: number, i: any) => sum + (i.price || 0) * i.qty,
          0,
        );
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
      minutes = Math.floor(elapsedMs / 60000);

      switch (tableData.status) {
        case "HOLD":
          bgColor = "rgba(37, 99, 235, 0.7)";
          borderColor = "#60a5fa";
          statusIcon = "pause-circle";
          statusColor = "#93c5fd";
          break;

        case "SENT":
          if (minutes >= 60) {
            bgColor = "rgba(220, 38, 38, 0.7)";
            borderColor = "#f87171";
            statusIcon = "warning";
            statusColor = "#fca5a5";
          } else {
            bgColor = "rgba(21, 128, 61, 0.7)";
            borderColor = "#4ade80";
            statusIcon = "checkmark-circle";
            statusColor = "#a7f3d0";
          }
          break;

        case "BILL_REQUESTED":
          bgColor = "rgba(180, 83, 9, 0.7)";
          borderColor = "#fbbf24";
          statusIcon = "receipt";
          statusColor = "#fde68a";
          break;

        default:
          bgColor = "rgba(30, 41, 59, 0.8)";
          borderColor = "rgba(255,255,255,0.25)";
          statusIcon = "person";
          statusColor = "#94a3b8";
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
          if (activeTab === "TAKEAWAY") {
            setOrderContext({
              orderType: "TAKEAWAY",
              takeawayNo: item.label,
            });
          } else {
            setOrderContext({
              orderType: "DINE_IN",
              section: activeTab,
              tableNo: item.label,
            });
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
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ImageBackground
        source={require("../../assets/images/a4.jpg")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <BlurView intensity={35} tint="dark" style={styles.topNavContainer}>
          <ScrollView
            ref={sectionScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            <View style={styles.tabsWrapper}>
              {SECTIONS.map((section) => {
                const isActive = activeTab === section;

                return (
                  <TouchableOpacity
                    key={section}
                    onPress={() => setActiveTab(section)}
                    style={[styles.tabBtn, isActive && styles.activeTabBtn]}
                  >
                    <Text
                      style={[styles.tabText, isActive && styles.activeTabText]}
                    >
                      {section.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.navRightGroup}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => router.push("/TimeEntry")}
            >
              <Text style={styles.headerActionText}>Time Entry</Text>
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
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  topNavContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  tabsWrapper: {
    flexDirection: "row",
    gap: 12,
  },

  tabsScrollContent: {
    alignItems: "center",
  },

  tabBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  activeTabBtn: {
    backgroundColor: "rgba(167,243,208,0.2)",
  },

  tabText: {
    color: "#e5e7eb",
    fontWeight: "700",
  },

  activeTabText: {
    color: "#a7f3d0",
  },

  navRightGroup: {
    flexDirection: "row",
    gap: 12,
  },

  headerActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  logoutBtn: {
    backgroundColor: "rgba(239,68,68,0.3)",
  },

  headerActionText: {
    color: "#fff",
    fontWeight: "800",
  },

  tableBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },

  tableContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },

  tableNumber: {
    fontWeight: "900",
    color: "#fff",
    marginBottom: 2,
  },

  tableInfo: {
    alignItems: "center",
  },

  timeText: {
    color: "#fff",
    fontWeight: "600",
  },

  orderText: {
    color: "#fff",
    fontWeight: "700",
  },

  billText: {
    color: "#fff",
    fontWeight: "900",
  },
});
