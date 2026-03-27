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
import { getContextId, setCartItemsGlobal, useCartStore } from "../../stores/cartStore";
import { getHeldOrders, removeHeldOrder } from "../../stores/heldOrdersStore";
import { setOrderContext } from "../../stores/orderContextStore";
import { useTableStatusStore } from "../../stores/tableStatusStore";

const API = "https://cafepos-production-3428.up.railway.app";

type TableItem = {
  id: string;
  label: string;
  DiningSection: number;
};

const SECTIONS = ["SECTION_1", "SECTION_2", "SECTION_3", "TAKEAWAY"];

export default function Category() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { section: urlSection } = useLocalSearchParams<{ section?: string }>();

  const [activeTab, setActiveTab] = useState<string>("SECTION_1");
  const [tablesFromDB, setTablesFromDB] = useState<TableItem[]>([]);

  const sectionScrollRef = useRef<ScrollView>(null);

  const tables = useTableStatusStore((s) => s.tables);
  const activeOrders = useActiveOrdersStore((s) => s.activeOrders);
  const carts = useCartStore((s) => s.carts);

  /* 🔥 FETCH TABLES */
  useEffect(() => {
    fetch(`${API}/tables`)
      .then((res) => res.json())
      .then((data) => {
        console.log("TABLES:", data);
        setTablesFromDB(data);
      })
      .catch((err) => console.error("TABLE ERROR:", err));
  }, []);

  useEffect(() => {
    if (urlSection && SECTIONS.includes(urlSection)) {
      setActiveTab(urlSection);
    }
  }, [urlSection]);

  let columns = 10;
  if (width < 600) columns = 4;
  else if (width < 900) columns = 5;
  else if (width < 1200) columns = 8;

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

  /* 🔥 DB FILTER */
  const currentTables = tablesFromDB.filter((t) => {
    if (activeTab === "SECTION_1") return t.DiningSection === 1;
    if (activeTab === "SECTION_2") return t.DiningSection === 2;
    if (activeTab === "SECTION_3") return t.DiningSection === 3;
    if (activeTab === "TAKEAWAY") return t.DiningSection === 4;
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
      const activeOrder = activeOrders.find((o: any) => o.orderId === tableData.orderId);
      if (activeOrder) {
        billAmount = activeOrder.items.reduce(
          (sum: number, i: any) => sum + (i.price || 0) * i.qty,
          0
        );
      }

      const time = new Date(tableData.startTime);
      timeText = `${time.getHours()}:${time.getMinutes()}`;
      orderText = `#${tableData.orderId}`;
    }

    return (
      <TouchableOpacity
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
          setOrderContext({
            orderType: activeTab === "TAKEAWAY" ? "TAKEAWAY" : "DINE_IN",
            section: activeTab,
            tableNo: item.label,
          });

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
              <Text style={[styles.billText, { fontSize: smallFont }]}>
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
      >
        <View style={styles.overlay} />

        <BlurView intensity={35} tint="dark" style={styles.topNavContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabsWrapper}>
              {SECTIONS.map((section) => (
                <TouchableOpacity
                  key={section}
                  onPress={() => setActiveTab(section)}
                  style={[
                    styles.tabBtn,
                    activeTab === section && styles.activeTabBtn,
                  ]}
                >
                  <Text style={styles.tabText}>
                    {section.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </BlurView>

        <FlatList
          data={currentTables}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={columns}
          contentContainerStyle={{
            padding: PADDING,
            gap: GAP,
          }}
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  topNavContainer: {
    padding: 20,
  },
  tabsWrapper: {
    flexDirection: "row",
    gap: 10,
  },
  tabBtn: {
    padding: 10,
    backgroundColor: "#333",
    borderRadius: 10,
  },
  activeTabBtn: {
    backgroundColor: "#16a34a",
  },
  tabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  tableBox: {
    borderWidth: 1,
    borderRadius: 10,
    margin: 5,
  },
  tableContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tableNumber: {
    color: "#fff",
    fontWeight: "bold",
  },
  tableInfo: {
    alignItems: "center",
  },
  timeText: { color: "#fff" },
  orderText: { color: "#fff" },
  billText: { color: "#fff" },
});