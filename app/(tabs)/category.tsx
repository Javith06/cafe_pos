import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useActiveOrdersStore } from "../activeOrdersStore";
import { getContextId, useCartStore } from "../cartStore";
import { setOrderContext } from "../orderContextStore";
import { getTables } from "../tableStatusStore";

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

  /* ---------------- Responsive Grid ---------------- */

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
    // Auto-scroll logic: find index of active tab and scroll to approx position
    const index = SECTIONS.indexOf(activeTab);
    if (index !== -1 && sectionScrollRef.current) {
      // Estimated scroll: 120 is approx width of a tab button + margin
      sectionScrollRef.current.scrollTo({ x: index * 100, animated: true });
    }
  }, [activeTab]);



  const numberFont = Math.max(12, Math.min(22, itemSize * 0.32));
  const smallFont = Math.max(9, Math.min(16, itemSize * 0.18));



  const currentTables =
    activeTab === "TAKEAWAY" ? TAKEAWAY_TABLES : DINE_IN_TABLES;

  /* ---------------- Table Card ---------------- */

  const renderItem = ({ item }: { item: TableItem }) => {

    const tables = getTables();
    const activeOrders = useActiveOrdersStore.getState().activeOrders;

    const tableData = tables.find(
      (t) => t.section === activeTab && t.tableNo === item.label
    );

    let borderColor = "rgba(255,255,255,0.25)";
    let bgColor = "rgba(255,255,255,0.05)";
    let tableNoColor = "#ffffff";
    let timeText = "";
    let orderText = "";
    let billAmount = 0;
    let isHeld = false;
    let minutes = 0;

    if (tableData) {


      const activeOrder = activeOrders.find((o: any) => 
        o.context.orderType === (activeTab === "TAKEAWAY" ? "TAKEAWAY" : "DINE_IN") &&
        (activeTab === "TAKEAWAY" ? o.context.takeawayNo === item.label : (o.context.section === activeTab && o.context.tableNo === item.label))
      );
      
      if (activeOrder) {
        billAmount = activeOrder.items.reduce((sum: number, i: any) => sum + (i.price || 0) * i.qty, 0);
      }

      // Add Cart Subtotal (Held / New items)
      const contextId = getContextId({
        orderType: activeTab === "TAKEAWAY" ? "TAKEAWAY" : "DINE_IN",
        section: activeTab,
        tableNo: item.label,
        takeawayNo: item.label
      });
      
      if (contextId) {
        const cartItems = carts[contextId] || [];
        const cartSubtotal = cartItems.reduce((sum: number, i: any) => sum + (i.price || 0) * i.qty, 0);
        billAmount += cartSubtotal;
      }

      const elapsedMs = Date.now() - tableData.startTime;
      minutes = Math.floor(elapsedMs / 60000);

      switch (tableData.status) {
        case 'HOLD':
          bgColor = "rgba(37, 99, 235, 1)"; // Solid Blue
          borderColor = "#60a5fa";
          isHeld = true;
          break;

        case 'SENT':
          if (minutes >= 60) {
            bgColor = "rgba(220, 38, 38, 1)"; // Solid Red (Active > 1hr)
            borderColor = "#ef4444";
          } else {
            bgColor = "rgba(21, 128, 61, 1)"; // Deep Green (Reference Image)
            borderColor = "#4ade80"; // Bright green border
          }
          break;
        case 'BILL_REQUESTED':
          bgColor = "rgba(180, 83, 9, 1)"; // Solid Dark Orange
          borderColor = "#fbbf24";
          break;
        default:
          bgColor = "rgba(30, 41, 59, 0.8)"; // Dark Slate Grey
          borderColor = "rgba(255, 255, 255, 0.25)";
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
            backgroundColor: bgColor, // Apply color here for full occupancy
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

        <View
          style={{ flex: 1 }}
        >
          <View style={styles.tableContent}>

            {isHeld && minutes >= 60 && (
              <View style={styles.holdRibbonContainer}>
                <View style={styles.holdRibbon}>
                  <Text style={styles.holdRibbonText}>HOLD</Text>
                </View>
              </View>
            )}


            <Text
              style={[
                styles.tableNumber,
                { fontSize: numberFont, color: "#ffffff" },
              ]}
            >
              {item.label}
            </Text>

            {tableData && (
              <>
                <Text style={[styles.timeText, { fontSize: smallFont, color: "#ffffff" }]}>
                  {timeText}
                </Text>

                <Text style={[styles.orderText, { fontSize: smallFont, color: borderColor }]}>
                  {orderText}
                </Text>
              </>
            )}

          </View>
        </View>

      </TouchableOpacity>
    );

  };


  /* ---------------- UI ---------------- */

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
            style={styles.tabsScrollView}
          >
            <View style={styles.tabsWrapper}>

            {SECTIONS.map((section) => {

              const isActive = activeTab === section;

              let displayName = section.replace("_", " ");

              if (width < 600) {
                if (section.startsWith("SECTION_")) {
                  displayName = section.replace("SECTION_", "S-");
                } else if (section === "TAKEAWAY") {
                  displayName = "T/A";
                }
              }

              return (
                <TouchableOpacity
                  key={section}
                  onPress={() => setActiveTab(section)}
                  style={[
                    styles.tabBtn,
                    isActive && styles.activeTabBtn,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isActive && styles.activeTabText,
                    ]}
                  >
                    {displayName}
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
    overflow: "hidden",
  },

  tabsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  tabsScrollView: {
    flex: 1,
  },
  tabsScrollContent: {
    alignItems: "center",
    paddingVertical: 10,
  },

  tabBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  activeTabBtn: {
    backgroundColor: "rgba(167,243,208,0.2)",
    borderColor: "#a7f3d0",
  },

  tabText: {
    color: "#e5e7eb",
    fontWeight: "700",
    fontSize: 16,
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
    fontWeight: "800",
    marginBottom: 4,
  },

  timeText: {
    color: "#fff",
    fontWeight: "500",
    marginBottom: 1,
  },

  orderText: {
    fontWeight: "700",
  },

  billText: {
    color: "#fff",
    fontWeight: "800",
    marginTop: 1,
  },

  holdRibbonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    overflow: "hidden",
    zIndex: 20,
  },
  holdRibbon: {
    position: "absolute",
    top: 8,
    left: -20,
    width: 80,
    height: 22,
    backgroundColor: "#f97316", // Orange
    transform: [{ rotate: "-45deg" }],
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  holdRibbonText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

});

