import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { clearCart } from "../cartStore";
import { getHeldOrders, HeldOrder } from "../heldOrdersStore";
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
const [, forceUpdate] = useState(0);

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

if (width <= 600) columns = 4;
else if (width <= 900) columns = 6;
else if (width <= 1200) columns = 8;

const GAP = 12;
const PADDING = 20;

const itemSize =
(width - PADDING * 2 - GAP * (columns - 1)) / columns;

const numberFont = Math.max(14, Math.min(18, itemSize * 0.22));
const smallFont = Math.max(12, Math.min(16, itemSize * 0.18));

const currentTables =
activeTab === "TAKEAWAY" ? TAKEAWAY_TABLES : DINE_IN_TABLES;

/* ---------------- Table Card ---------------- */

const renderItem = ({ item }: { item: TableItem }) => {

const tables = getTables();

const tableData = tables.find(
  (t) => t.section === activeTab && t.tableNo === item.label
);

let borderColor = "rgba(255,255,255,0.25)";
let bgColor = "rgba(255,255,255,0.05)";
let tableNoColor = "#ffffff";
let timeText = "";
let orderText = "";

if (tableData) {

  const minutes = Math.floor((Date.now() - tableData.startTime) / 60000);

  if (minutes >= 30) {
    bgColor = "rgba(220,38,38,0.6)"; // Darker Red
    tableNoColor = "#fee2e2";
    borderColor = "rgba(248,113,113,0.95)";
  } else if (minutes >= 15) {
    bgColor = "rgba(217,119,6,0.6)"; // Darker Orange
    tableNoColor = "#fef3c7";
    borderColor = "rgba(251,191,36,0.95)";
  } else {
    bgColor = "rgba(22,163,74,0.6)"; // Darker Green
    tableNoColor = "#dcfce7";
    borderColor = "rgba(74,222,128,0.95)";
  }

  const time = new Date(tableData.startTime);
  const hours = time.getHours().toString().padStart(2, "0");
  const mins = time.getMinutes().toString().padStart(2, "0");

  timeText = `${hours}:${mins}`;
  orderText = `#${tableData.orderId}`;

} else {

  const heldOrders = getHeldOrders();

  const isHeld = heldOrders.some((h: HeldOrder) => {
    if (activeTab === "TAKEAWAY") {
      return (
        h.context?.orderType === "TAKEAWAY" &&
        h.context.takeawayNo === item.label
      );
    }

    return (
      h.context?.orderType === "DINE_IN" &&
      h.context.section === activeTab &&
      h.context.tableNo === item.label
    );
  });

  if (isHeld) {
    bgColor = "rgba(202,138,4,0.6)"; // Dark yellow / Gold
    tableNoColor = "#fef08a";
    borderColor = "rgba(234,179,8,0.95)";
    timeText = "Held";
  }
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

      clearCart();
      router.push("/menu/thai_kitchen");

    }}
  >

    <BlurView
      intensity={40}
      tint="dark"
      style={{ flex: 1, backgroundColor: bgColor }}
    >
      <View style={styles.tableContent}>

        <Text
          style={[
            styles.tableNumber,
            { fontSize: numberFont, color: tableNoColor },
          ]}
        >
          {item.label}
        </Text>

        {tableData && (
          <>
            <Text style={[styles.timeText, { fontSize: smallFont }]}>
              {timeText}
            </Text>

            <Text style={[styles.orderText, { fontSize: smallFont }]}>
              {orderText}
            </Text>
          </>
        )}

      </View>
    </BlurView>

  </TouchableOpacity>
);

};

/* ---------------- UI ---------------- */

return (
<SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
<ImageBackground
  source={require("../../assets/images/11.jpg")}
  style={styles.background}
  resizeMode="cover"
>

  <View style={styles.overlay} />

  {/* TOP NAV */}

  <BlurView intensity={35} tint="dark" style={styles.topNavContainer}>

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

  {/* TABLE GRID */}

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

/* NAVBAR */

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
gap: 12,
flexWrap: "wrap",
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
backgroundColor: "rgba(215,255,154,0.2)",
borderColor: "#d7ff9a",
},

tabText: {
color: "#fff",
fontWeight: "700",
fontSize: 16,
},

activeTabText: {
color: "#d7ff9a",
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

/* TABLE */

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
textShadowColor: "rgba(0,0,0,0.7)",
textShadowOffset: { width: 0, height: 1 },
textShadowRadius: 2,
},

timeText: {
color: "#fff",
fontWeight: "500",
marginBottom: 2,
},

orderText: {
color: "#d7ff9a",
fontWeight: "600",
},

});
