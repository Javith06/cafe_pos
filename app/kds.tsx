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
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveOrdersStore } from "../stores/activeOrdersStore";
import { Fonts } from "../constants/Fonts";

// ─── Urgency thresholds (minutes) ───────────────────────────────────────────
const URGENCY_FRESH  = 15;  // 0–15 min  → green
const URGENCY_WARN   = 30;  // 15–30 min → amber
// > 30 min → red (critical)

type UrgencyLevel = "fresh" | "warn" | "critical";

function getUrgency(minutes: number): UrgencyLevel {
  if (minutes < URGENCY_FRESH) return "fresh";
  if (minutes < URGENCY_WARN)  return "warn";
  return "critical";
}

const URGENCY_COLORS: Record<UrgencyLevel, { timer: string; border: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  fresh:    { timer: "#4ade80", border: "rgba(74,222,128,0.3)",  bg: "rgba(20,83,45,0.25)",   label: "On Track",  icon: "checkmark-circle-outline" },
  warn:     { timer: "#fbbf24", border: "rgba(251,191,36,0.4)",  bg: "rgba(120,80,9,0.3)",    label: "Running Long", icon: "time-outline" },
  critical: { timer: "#f87171", border: "rgba(248,113,113,0.5)", bg: "rgba(127,29,29,0.35)",  label: "Overdue!",  icon: "alert-circle-outline" },
};

export default function KDSScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const activeOrders = useActiveOrdersStore((s) => s.activeOrders);

  const [time, setTime] = useState(Date.now());
  const blinkAnim  = useRef(new Animated.Value(1)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;

  /* LIVE TIMER — updates every second */
  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  /* NEW ITEM blink animation */
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.15, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  /* CRITICAL pulse for overdue cards */
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  /* FILTER SENT ITEMS only */
  const kitchenOrders = useMemo(() => {
    return activeOrders
      .map((order) => {
        const sentItems = order.items.filter((i: any) => i.status === "SENT");
        if (sentItems.length === 0) return null;
        return { ...order, items: sentItems };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.createdAt - b.createdAt);
  }, [activeOrders]);

  const numColumns = width > 1400 ? 4 : width > 1000 ? 3 : width > 700 ? 2 : 1;

  // Count orders by urgency for the header stats
  const stats = useMemo(() => {
    let fresh = 0, warn = 0, critical = 0;
    kitchenOrders.forEach((order: any) => {
      const latestSent = Math.max(...order.items.map((i: any) => i.sentAt || order.createdAt));
      const mins = Math.floor((time - latestSent) / 60000);
      const u = getUrgency(mins);
      if (u === "fresh") fresh++;
      else if (u === "warn") warn++;
      else critical++;
    });
    return { fresh, warn, critical, total: kitchenOrders.length };
  }, [kitchenOrders, time]);

  const renderOrder = ({ item }: any) => {
    const latestSent = Math.max(
      ...item.items.map((i: any) => i.sentAt || item.createdAt),
    );
    const elapsed = time - latestSent;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const urgency = getUrgency(minutes);
    const uc = URGENCY_COLORS[urgency];

    const timerOpacity = urgency === "critical" ? pulseAnim : 1;

    return (
      <View style={[styles.cardOuter, { borderColor: uc.border }]}>
        {/* Urgency tinted background */}
        <View style={[styles.cardUrgencyBg, { backgroundColor: uc.bg }]} />

        <BlurView intensity={40} tint="dark" style={styles.cardInner}>
          {/* ── Card Header ── */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.table}>
                {item.context.orderType === "DINE_IN"
                  ? `Table ${item.context.tableNo}`
                  : `T/A ${item.context.takeawayNo}`}
              </Text>
              <Text style={styles.orderId}>#{item.orderId}</Text>
            </View>

            {/* Timer + urgency indicator */}
            <View style={styles.timerBlock}>
              <Animated.Text style={[styles.timer, { color: uc.timer, opacity: timerOpacity }]}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </Animated.Text>
              <View style={[styles.urgencyPill, { borderColor: uc.border }]}>
                <Ionicons name={uc.icon} size={11} color={uc.timer} />
                <Text style={[styles.urgencyLabel, { color: uc.timer }]}>{uc.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Items ── */}
          {item.items.map((i: any) => {
            const sentTime = i.sentAt || item.createdAt;
            const elapsedItem = time - sentTime;
            const isNew = i.sentAt && elapsedItem < 300000; // < 5 min

            return (
              <View key={i.lineItemId} style={styles.itemBlock}>
                <View style={styles.itemRow}>
                  <View style={styles.itemQtyWrap}>
                    <Text style={styles.itemQty}>{i.qty}×</Text>
                  </View>
                  <Text style={styles.itemText} numberOfLines={2}>
                    {i.name}
                  </Text>
                  {isNew && (
                    <Animated.View style={[styles.newBadge, { opacity: blinkAnim }]}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </Animated.View>
                  )}
                </View>

                {/* Modifiers */}
                {i.spicy && i.spicy !== "Medium" && (
                  <Text style={styles.modifier}>🌶 Spicy: {i.spicy}</Text>
                )}
                {i.oil && i.oil !== "Normal" && (
                  <Text style={styles.modifier}>🫙 Oil: {i.oil}</Text>
                )}
                {i.salt && i.salt !== "Normal" && (
                  <Text style={styles.modifier}>🧂 Salt: {i.salt}</Text>
                )}
                {i.sugar && i.sugar !== "Normal" && (
                  <Text style={styles.modifier}>🍬 Sugar: {i.sugar}</Text>
                )}
                {i.note && <Text style={styles.modifier}>📝 {i.note}</Text>}
                {i.modifiers && Array.isArray(i.modifiers) && i.modifiers.map((mod: any, idx: number) => (
                  <Text key={`mod-${idx}`} style={styles.modifier}>+ {mod.ModifierName}</Text>
                ))}
              </View>
            );
          })}
        </BlurView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require("../assets/images/mesh_bg.png")}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        {/* ══ TOP BAR ══ */}
        <BlurView intensity={50} tint="dark" style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Ionicons name="fast-food-outline" size={20} color="#22c55e" />
            <Text style={styles.screenTitle}>Kitchen Display</Text>
          </View>

          {/* Live order stats */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <View style={[styles.statDot, { backgroundColor: "#4ade80" }]} />
              <Text style={styles.statText}>{stats.fresh}</Text>
            </View>
            <View style={styles.statChip}>
              <View style={[styles.statDot, { backgroundColor: "#fbbf24" }]} />
              <Text style={styles.statText}>{stats.warn}</Text>
            </View>
            <View style={styles.statChip}>
              <View style={[styles.statDot, { backgroundColor: "#f87171" }]} />
              <Text style={styles.statText}>{stats.critical}</Text>
            </View>
            <Text style={styles.statTotal}>{stats.total} orders</Text>
          </View>
        </BlurView>

        {/* ══ URGENCY LEGEND ══ */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#4ade80" }]} />
            <Text style={styles.legendText}>0–{URGENCY_FRESH}m Fresh</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#fbbf24" }]} />
            <Text style={styles.legendText}>{URGENCY_FRESH}–{URGENCY_WARN}m Running Long</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#f87171" }]} />
            <Text style={styles.legendText}>{URGENCY_WARN}m+ Overdue</Text>
          </View>
        </View>

        {/* ══ ORDERS GRID ══ */}
        <FlatList
          key={numColumns}
          data={kitchenOrders}
          renderItem={renderOrder}
          keyExtractor={(item: any) => item.orderId}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          columnWrapperStyle={numColumns > 1 ? { gap: 0 } : undefined}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color="rgba(74,222,128,0.3)" />
              <Text style={styles.emptyText}>All Clear!</Text>
              <Text style={styles.emptySub}>No pending kitchen orders</Text>
            </View>
          }
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  /* ── Top Bar ── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  titleBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  screenTitle: {
    color: "#f1f5f9",
    fontFamily: Fonts.black,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statText: { color: "#fff", fontFamily: Fonts.bold, fontSize: 13 },
  statTotal: { color: "#64748b", fontFamily: Fonts.medium, fontSize: 12, marginLeft: 4 },

  /* ── Legend ── */
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "#64748b", fontFamily: Fonts.medium, fontSize: 11 },

  /* ── Order Cards ── */
  list: { padding: 12, paddingBottom: 40 },
  cardOuter: {
    flex: 1,
    margin: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    minHeight: 200,
  },
  cardUrgencyBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  cardInner: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
  },

  /* Card header */
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardHeaderLeft: { flex: 1 },
  table: {
    color: "#fff",
    fontSize: 22,
    fontFamily: Fonts.black,
    letterSpacing: 0.3,
  },
  orderId: {
    color: "#64748b",
    marginTop: 2,
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  timerBlock: { alignItems: "flex-end", gap: 4 },
  timer: {
    fontSize: 22,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  urgencyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  urgencyLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 10,
  },

  /* Items */
  itemBlock: { marginBottom: 10 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemQtyWrap: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemQty: {
    color: "#94a3b8",
    fontFamily: Fonts.black,
    fontSize: 13,
  },
  itemText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.extraBold,
    flex: 1,
  },
  newBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  modifier: {
    color: "#94a3b8",
    fontSize: 13,
    marginLeft: 28,
    marginTop: 2,
    fontFamily: Fonts.regular,
  },

  /* Empty state */
  emptyContainer: {
    alignItems: "center",
    marginTop: 180,
    gap: 10,
  },
  emptyText: {
    color: "#fff",
    fontSize: 28,
    fontFamily: Fonts.black,
    marginTop: 8,
  },
  emptySub: {
    color: "#64748b",
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
});
