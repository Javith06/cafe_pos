import { BlurView } from "expo-blur";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useActiveOrdersStore } from "../stores/activeOrdersStore";

export default function KDSScreen() {
  const { width } = useWindowDimensions();
  const activeOrders = useActiveOrdersStore((s) => s.activeOrders);

  const [time, setTime] = useState(Date.now());

  const blinkAnim = useRef(new Animated.Value(1)).current;

  /* LIVE TIMER */
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* BLINK ANIMATION */
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  /* FILTER SENT ITEMS */
  const kitchenOrders = useMemo(() => {
    return activeOrders
      .map((order) => {
        const sentItems = order.items.filter((i: any) => i.status === "SENT");

        if (sentItems.length === 0) return null;

        return {
          ...order,
          items: sentItems,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.createdAt - b.createdAt);
  }, [activeOrders]);

  const numColumns = width > 1400 ? 4 : width > 1000 ? 3 : width > 700 ? 2 : 1;

  const renderOrder = ({ item }: any) => {
    const latestSent = Math.max(
      ...item.items.map((i: any) => i.sentAt || item.createdAt),
    );

    const elapsed = time - latestSent;

    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    return (
      <BlurView intensity={50} tint="dark" style={styles.card}>
        <Text style={styles.table}>
          {item.context.orderType === "DINE_IN"
            ? `Table ${item.context.tableNo}`
            : `Takeaway ${item.context.takeawayNo}`}
        </Text>

        <Text style={styles.orderId}>Order #{item.orderId}</Text>

        <Text style={styles.timer}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </Text>

        <View style={styles.divider} />

        {item.items.map((i: any) => {
          const sentTime = i.sentAt || item.createdAt;
          const elapsedItem = time - sentTime;

          /* NEW for 5 minutes */
          const isNew = i.sentAt && elapsedItem < 300000;

          return (
            <View key={i.lineItemId} style={styles.itemBlock}>
              <View style={styles.itemRow}>
                <Text style={styles.itemText}>
                  {i.qty}x {i.name}
                </Text>

                {isNew && (
                  <Animated.Text
                    style={[styles.newBadge, { opacity: blinkAnim }]}
                  >
                    NEW
                  </Animated.Text>
                )}
              </View>

              {i.spicy && i.spicy !== "Medium" && (
                <Text style={styles.modifier}>Spicy: {i.spicy}</Text>
              )}

              {i.oil && i.oil !== "Normal" && (
                <Text style={styles.modifier}>Oil: {i.oil}</Text>
              )}

              {i.salt && i.salt !== "Normal" && (
                <Text style={styles.modifier}>Salt: {i.salt}</Text>
              )}

              {i.sugar && i.sugar !== "Normal" && (
                <Text style={styles.modifier}>Sugar: {i.sugar}</Text>
              )}

              {i.note && <Text style={styles.modifier}>Note: {i.note}</Text>}
            </View>
          );
        })}
      </BlurView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={require("../assets/images/a4.jpg")}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <FlatList
          key={numColumns}
          data={kitchenOrders}
          renderItem={renderOrder}
          keyExtractor={(item: any) => item.orderId}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No Kitchen Orders</Text>
              <Text style={styles.emptySub}>
                Orders appear after pressing SEND
              </Text>
            </View>
          }
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  list: {
    padding: 20,
  },

  card: {
    flex: 1,
    margin: 8,
    padding: 18,
    borderRadius: 20,
    minHeight: 220,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  table: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },

  orderId: {
    color: "#94a3b8",
    marginTop: 2,
  },

  timer: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 10,
  },

  itemBlock: {
    marginBottom: 8,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  itemText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  newBadge: {
    color: "#fff",
    backgroundColor: "#ef4444",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  modifier: {
    color: "#94a3b8",
    fontSize: 14,
    marginLeft: 4,
  },

  emptyContainer: {
    alignItems: "center",
    marginTop: 200,
  },

  emptyText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },

  emptySub: {
    color: "#94a3b8",
    marginTop: 10,
  },
});
