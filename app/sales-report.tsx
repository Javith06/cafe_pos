import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Dimensions,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Fonts } from "../constants/Fonts";
import { API_URL } from "../constants/Config";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
// const API_URL = "https://cafepos-production-3428.up.railway.app";

type FilterType = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export default function SalesReport() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("DAILY");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activePaymentModes, setActivePaymentModes] = useState<string[]>(["CASH", "CARD", "NETS", "PAYNOW"]);
  const [activeOrderTypes, setActiveOrderTypes] = useState<string[]>(["DINE-IN", "TAKEAWAY"]);
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "HIGHEST">("NEWEST");

  const isTablet = SCREEN_W >= 768;

  // Persistence: Load on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedDate = await AsyncStorage.getItem("sales_selected_date");
        const savedFilter = await AsyncStorage.getItem("sales_selected_filter");
        const savedModes = await AsyncStorage.getItem("sales_payment_modes");
        const savedTypes = await AsyncStorage.getItem("sales_order_types");
        const savedSort = await AsyncStorage.getItem("sales_sort_order");

        if (savedDate) setSelectedDate(savedDate);
        if (savedFilter) setSelectedFilter(savedFilter as FilterType);
        if (savedModes) setActivePaymentModes(JSON.parse(savedModes));
        if (savedTypes) setActiveOrderTypes(JSON.parse(savedTypes));
        if (savedSort) setSortOrder(savedSort as "NEWEST" | "HIGHEST");
      } catch (e) {
        console.error("Load state error:", e);
      }
    };
    loadState();
  }, []);

  // Persistence: Save on change
  useEffect(() => {
    AsyncStorage.setItem("sales_selected_date", selectedDate);
    AsyncStorage.setItem("sales_selected_filter", selectedFilter);
    AsyncStorage.setItem("sales_payment_modes", JSON.stringify(activePaymentModes));
    AsyncStorage.setItem("sales_order_types", JSON.stringify(activeOrderTypes));
    AsyncStorage.setItem("sales_sort_order", sortOrder);
    fetchData();
  }, [selectedDate, selectedFilter, activePaymentModes, activeOrderTypes, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchSales(), fetchSummary()]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sales/all`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setSales(data);
      } else {
        setSales([]);
      }
    } catch (error) {
      console.error("Sales fetch error:", error);
      setSales([]);
    }
  };

  const fetchSummary = async () => {
    try {
      let url = "";
      if (selectedFilter === "DAILY") {
        url = `${API_URL}/api/sales/daily/${selectedDate}`;
        const response = await fetch(url);
        const data = await response.json();
        setSummary(data);
      } else {
        // Calculate range
        const end = new Date(selectedDate);
        const start = new Date(selectedDate);

        if (selectedFilter === "WEEKLY") {
          start.setDate(start.getDate() - 6);
        } else if (selectedFilter === "MONTHLY") {
          start.setDate(1);
          end.setMonth(end.getMonth() + 1);
          end.setDate(0);
        } else if (selectedFilter === "YEARLY") {
          start.setMonth(0, 1);
          end.setMonth(11, 31);
        }

        const startStr = start.toISOString().split("T")[0];
        const endStr = end.toISOString().split("T")[0];
        url = `${API_URL}/api/sales/range?startDate=${startStr}&endDate=${endStr}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Aggregate range data
        if (Array.isArray(data)) {
          const aggregated = data.reduce((acc, curr) => ({
            TotalTransactions: acc.TotalTransactions + curr.TotalTransactions,
            TotalSales: acc.TotalSales + curr.TotalSales,
            CashSales: acc.CashSales + curr.CashSales,
            NETS_Sales: acc.NETS_Sales + curr.NETS_Sales,
            PayNow_Sales: acc.PayNow_Sales + curr.PayNow_Sales,
            TotalItems: acc.TotalItems + (curr.TotalItems || 0),
          }), { TotalTransactions: 0, TotalSales: 0, CashSales: 0, NETS_Sales: 0, PayNow_Sales: 0, TotalItems: 0 });
          setSummary(aggregated);
        } else {
          setSummary(null);
        }
      }
    } catch (error) {
      console.error("Summary fetch error:", error);
      setSummary(null);
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount?.toFixed(2) || "0.00"}`;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  };

  // CLIENT-SIDE FILTERING & SORTING
  const filteredSales = useMemo(() => {
    const filtered = sales.filter((s) => {
       const modeMatch = activePaymentModes.includes(s.PayMode);
       // Mock for now: assume all are DINE-IN if field missing OR if takeaway badge not applied yet
       const typeMatch = activeOrderTypes.length === 2 || (s.OrderType ? activeOrderTypes.includes(s.OrderType) : activeOrderTypes.includes("DINE-IN"));
       return modeMatch && typeMatch;
    });

    if (sortOrder === "NEWEST") {
      return [...filtered].sort((a, b) => new Date(b.SettlementDate).getTime() - new Date(a.SettlementDate).getTime());
    } else {
      return [...filtered].sort((a, b) => b.SysAmount - a.SysAmount);
    }
  }, [sales, activePaymentModes, activeOrderTypes, sortOrder]);

  const filteredMetrics = useMemo(() => {
    if (!summary || selectedFilter === "DAILY") {
       // If daily, summary is usually correct but we should filter based on activePaymentModes
       // We can recalculate from the full sales list if it contains all sales for the day
       const daySales = sales.filter(s => s.SettlementDate && s.SettlementDate.startsWith(selectedDate));
       const filtered = daySales.filter(s => activePaymentModes.includes(s.PayMode));
       
       return {
         TotalSales: filtered.reduce((acc, s) => acc + s.SysAmount, 0),
         TotalTransactions: filtered.length,
         TotalItems: filtered.reduce((acc, s) => acc + (s.ReceiptCount || 0), 0),
         Cash: filtered.filter(s => s.PayMode === "CASH").reduce((acc, s) => acc + s.SysAmount, 0),
         Card: filtered.filter(s => s.PayMode === "CARD").reduce((acc, s) => acc + s.SysAmount, 0),
         Nets: filtered.filter(s => s.PayMode === "NETS").reduce((acc, s) => acc+ s.SysAmount, 0),
         PayNow: filtered.filter(s=> s.PayMode === "PAYNOW").reduce((acc, s) => acc + s.SysAmount, 0),
       };
    }
    
    // For Weekly/Monthly we calculate from the sales list directly
    const filtered = filteredSales;
    return {
       TotalSales: filtered.reduce((acc, s) => acc + s.SysAmount, 0),
       TotalTransactions: filtered.length,
       TotalItems: filtered.reduce((acc, s) => acc + (s.ReceiptCount || 0), 0),
       Cash: filtered.filter(s => s.PayMode === "CASH").reduce((acc, s) => acc + s.SysAmount, 0),
       Card: filtered.filter(s => s.PayMode === "CARD").reduce((acc, s) => acc + s.SysAmount, 0),
       Nets: filtered.filter(s => s.PayMode === "NETS").reduce((acc, s) => acc+ s.SysAmount, 0),
       PayNow: filtered.filter(s=> s.PayMode === "PAYNOW").reduce((acc, s) => acc + s.SysAmount, 0),
    };
  }, [filteredSales, summary, selectedFilter, selectedDate, activePaymentModes]);

  const avgOrder = useMemo(() => {
    if (!filteredMetrics.TotalTransactions) return 0;
    return filteredMetrics.TotalSales / filteredMetrics.TotalTransactions;
  }, [filteredMetrics]);

  const paymentMix = useMemo(() => {
    if (!filteredMetrics.TotalSales) return { cash: 0, card: 0, nets: 0, paynow: 0 };
    return {
      cash: (filteredMetrics.Cash / filteredMetrics.TotalSales) * 100,
      card: (filteredMetrics.Card / filteredMetrics.TotalSales) * 100,
      nets: (filteredMetrics.Nets / filteredMetrics.TotalSales) * 100,
      paynow: (filteredMetrics.PayNow / filteredMetrics.TotalSales) * 100,
    };
  }, [filteredMetrics]);

  const togglePaymentMode = (mode: string) => {
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
     setActivePaymentModes(prev => 
       prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
     );
  };

  const toggleOrderType = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveOrderTypes(prev => 
       prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
     );
  };

  const fetchOrderDetails = async (settlementId: string) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(`${API_URL}/api/sales/detail/${settlementId}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setOrderDetails(data);
        } else {
          // Fallback mock if data is empty
          setOrderDetails([
            { DishName: "Item info not available", Qty: 0, Price: 0 },
          ]);
        }
      }
    } catch (e) {
      console.error("Detail fetch error:", e);
      setOrderDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOrderPress = (order: any) => {
    setSelectedOrder(order);
    fetchOrderDetails(order.SettlementID);
  };

  const renderMetricTile = (
    label: string,
    value: string | number,
    icon: any,
    color: string
  ) => (
    <View style={[styles.metricTile, { borderLeftColor: color }]}>
      <View style={styles.tileHeader}>
        <Ionicons name={icon} size={14} color="#94a3b8" />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require("../assets/images/mesh_bg.png")}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.overlay}>
            {/* Header / Nav */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>SALES DASHBOARD</Text>
                <Text style={styles.headerSubtitle}>Real-time performance analytics</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFilterPanel(true)}
                style={styles.filterMenuBtn}
              >
                <Ionicons name="filter-outline" size={20} color="#22c55e" />
                <Text style={styles.filterBtnLabel}>FILTER</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={styles.badgeRow}>
                {activePaymentModes.length < 4 && activePaymentModes.map(m => (
                  <View key={m} style={[styles.activeBadge, { borderColor: m === "CARD" ? "#818cf8" : "#22c55e" }]}>
                    <Text style={[styles.badgeText, m === "CARD" && { color: "#818cf8" }]}>{m}</Text>
                    <TouchableOpacity onPress={() => togglePaymentMode(m)}>
                      <Ionicons name="close-circle" size={14} color={m === "CARD" ? "#818cf8" : "#22c55e"} />
                    </TouchableOpacity>
                  </View>
                ))}
                {activeOrderTypes.length < 2 && activeOrderTypes.map(t => (
                  <View key={t} style={[styles.activeBadge, { borderColor: "#3b82f6" }]}>
                    <Text style={[styles.badgeText, { color: "#3b82f6" }]}>{t}</Text>
                    <TouchableOpacity onPress={() => toggleOrderType(t)}>
                      <Ionicons name="close-circle" size={14} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                ))}
                {sortOrder === "HIGHEST" && (
                   <View style={[styles.activeBadge, { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "#f59e0b" }]}>
                     <Text style={[styles.badgeText, { color: "#f59e0b" }]}>TOP SALES</Text>
                   </View>
                )}
              </View>
              {/* Filter Toggles */}
              <View style={styles.filterBar}>
                {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as FilterType[]).map(
                  (f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setSelectedFilter(f)}
                      style={[
                        styles.filterBtn,
                        selectedFilter === f && styles.activeFilterBtn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          selectedFilter === f && styles.activeFilterText,
                        ]}
                      >
                        {f}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* Date Navigation */}
              <View style={styles.dateControl}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Text style={styles.dateText}>{selectedDate}</Text>
                </View>
                <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.metricsGrid}>
                {renderMetricTile(
                  "Gross Revenue",
                  formatCurrency(filteredMetrics.TotalSales),
                  "card-outline",
                  "#22c55e"
                )}
                {renderMetricTile(
                  "Avg Check",
                  formatCurrency(avgOrder),
                  "analytics-outline",
                  "#3b82f6"
                )}
                {renderMetricTile(
                  "Total Orders",
                  filteredMetrics.TotalTransactions,
                  "receipt-outline",
                  "#f59e0b"
                )}
                {renderMetricTile(
                  "Items Sold",
                  filteredMetrics.TotalItems,
                  "fast-food-outline",
                  "#ec4899"
                )}
              </View>

              {/* Payment Mix Chart */}
              <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>PAYMENT CHANNEL MIX</Text>
                <View style={styles.progressRow}>
                  {paymentMix.cash > 0 && <View style={[styles.progressSegment, { width: `${paymentMix.cash}%`, backgroundColor: "#22c55e" }]} />}
                  {paymentMix.card > 0 && <View style={[styles.progressSegment, { width: `${paymentMix.card}%`, backgroundColor: "#818cf8" }]} />}
                  {paymentMix.nets > 0 && <View style={[styles.progressSegment, { width: `${paymentMix.nets}%`, backgroundColor: "#3b82f6" }]} />}
                  {paymentMix.paynow > 0 && <View style={[styles.progressSegment, { width: `${paymentMix.paynow}%`, backgroundColor: "#f59e0b" }]} />}
                </View>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                    <Text style={styles.legendText}>CASH ({paymentMix.cash.toFixed(0)}%)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: "#818cf8" }]} />
                    <Text style={styles.legendText}>CARD ({paymentMix.card.toFixed(0)}%)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: "#3b82f6" }]} />
                    <Text style={styles.legendText}>NETS ({paymentMix.nets.toFixed(0)}%)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                    <Text style={styles.legendText}>DIGITAL ({paymentMix.paynow.toFixed(0)}%)</Text>
                  </View>
                </View>
              </View>

              {/* Recent Activity */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>RECENT ACTIVITY</Text>
                <TouchableOpacity onPress={() => fetchData()}>
                  <Text style={styles.seeAllText}>REFRESH</Text>
                </TouchableOpacity>
              </View>

              {filteredSales.slice(0, 30).map((item, idx) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={idx}
                  onPress={() => handleOrderPress(item)}
                  style={styles.transactionCard}
                >
                  <View style={styles.txLeft}>
                    <View style={styles.txIconWrap}>
                       <Ionicons 
                        name={item.PayMode === "CASH" ? "cash-outline" : item.PayMode === "NETS" ? "card-outline" : "qr-code-outline"} 
                        size={18} 
                        color="#94a3b8" 
                       />
                    </View>
                    <View>
                      <Text style={styles.txTitle}>Order Settled</Text>
                      <Text style={styles.txSub}>
                        {new Date(item.SettlementDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.PayMode}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={styles.txAmount}>{formatCurrency(item.SysAmount)}</Text>
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidText}>PAID</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ORDER DETAIL MODAL */}
            <Modal
              visible={!!selectedOrder}
              transparent
              animationType="fade"
              onRequestClose={() => setSelectedOrder(null)}
            >
              <BlurView intensity={15} tint="dark" style={styles.modalOverlay}>
                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.modalDismiss}
                  onPress={() => setSelectedOrder(null)}
                />
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}># {selectedOrder?.SettlementID?.slice(0, 8)}</Text>
                      <Text style={styles.modalSub}>{new Date(selectedOrder?.SettlementDate).toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeBtn}>
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalDivider} />

                  <View style={styles.modalBody}>
                    <Text style={styles.orderLabel}>ORDER SUMMARY</Text>
                    
                    {loadingDetails ? (
                      <ActivityIndicator color="#22c55e" style={{ marginVertical: 30 }} />
                    ) : orderDetails.length > 0 ? (
                      <View style={styles.itemsList}>
                        {orderDetails.map((item, idx) => (
                          <View key={idx} style={styles.orderItemRow}>
                            <Text style={styles.orderItemQty}>{item.Qty}x</Text>
                            <Text style={styles.orderItemName}>{item.DishName}</Text>
                            <Text style={styles.orderItemPrice}>${(item.Price * item.Qty).toFixed(2)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", marginVertical: 20 }}>
                        No item data found for this transaction
                      </Text>
                    )}

                    <View style={styles.modalDivider} />

                    <View style={styles.paymentSummary}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Grand Total</Text>
                        <Text style={styles.totalValue}>${selectedOrder?.SysAmount?.toFixed(2)}</Text>
                      </View>
                      <View style={styles.paymentRowDetail}>
                        <Text style={styles.paymentLabelDetail}>Payment Mode</Text>
                        <Text style={styles.paymentValueDetail}>{selectedOrder?.PayMode}</Text>
                      </View>
                      <View style={styles.paymentRowDetail}>
                        <Text style={styles.paymentLabelDetail}>Status</Text>
                        <Text style={[styles.paymentValueDetail, { color: "#22c55e" }]}>Settled ✅</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedOrder(null)}
                    style={styles.doneBtn}
                  >
                    <Text style={styles.doneBtnText}>CLOSE</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </Modal>

            {/* ADVANCED FILTER SIDEBAR */}
            <Modal
              visible={showFilterPanel}
              transparent
              animationType="none"
              onRequestClose={() => setShowFilterPanel(false)}
            >
              <View style={styles.sidebarOverlay}>
                <TouchableOpacity 
                   activeOpacity={1} 
                   style={styles.sidebarDismiss} 
                   onPress={() => setShowFilterPanel(false)} 
                />
                <View style={styles.sidebarContent}>
                  <View style={styles.sidebarHeader}>
                    <Text style={styles.sidebarTitle}>ADVANCED FILTERS</Text>
                    <TouchableOpacity onPress={() => setShowFilterPanel(false)}>
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.sidebarSection}>
                      <Text style={styles.sectionLabel}>PAYMENT MODES</Text>
                      <View style={styles.chipRow}>
                        {["CASH", "CARD", "NETS", "PAYNOW"].map(m => (
                          <TouchableOpacity 
                            key={m} 
                            onPress={() => togglePaymentMode(m)}
                            style={[styles.chip, activePaymentModes.includes(m) && styles.activeChip]}
                          >
                            <Text style={[styles.chipText, activePaymentModes.includes(m) && styles.activeChipText]}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.sidebarSection}>
                      <Text style={styles.sectionLabel}>ORDER TYPE</Text>
                      <View style={styles.chipRow}>
                        {["DINE-IN", "TAKEAWAY"].map(t => (
                          <TouchableOpacity 
                            key={t} 
                            onPress={() => toggleOrderType(t)}
                            style={[styles.chip, activeOrderTypes.includes(t) && styles.activeChip, { minWidth: 100 }]}
                          >
                            <Text style={[styles.chipText, activeOrderTypes.includes(t) && styles.activeChipText]}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.sidebarSection}>
                      <Text style={styles.sectionLabel}>SORT BY</Text>
                      <TouchableOpacity 
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSortOrder("NEWEST");
                        }}
                        style={[styles.sortBtn, sortOrder === "NEWEST" && styles.activeSortBtn]}
                      >
                        <Ionicons name="time-outline" size={18} color={sortOrder === "NEWEST" ? "#22c55e" : "#64748b"} />
                        <Text style={[styles.sortText, sortOrder === "NEWEST" && styles.activeSortText]}>Newest First</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSortOrder("HIGHEST");
                        }}
                        style={[styles.sortBtn, sortOrder === "HIGHEST" && styles.activeSortBtn]}
                      >
                        <Ionicons name="trending-up-outline" size={18} color={sortOrder === "HIGHEST" ? "#22c55e" : "#64748b"} />
                        <Text style={[styles.sortText, sortOrder === "HIGHEST" && styles.activeSortText]}>Highest Amount</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <View style={styles.sidebarFooter}>
                    <TouchableOpacity 
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setActivePaymentModes(["CASH", "CARD", "NETS", "PAYNOW"]);
                        setActiveOrderTypes(["DINE-IN", "TAKEAWAY"]);
                        setSortOrder("NEWEST");
                      }}
                      style={styles.resetBtn}
                    >
                      <Text style={styles.resetText}>RESET ALL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowFilterPanel(false);
                      }}
                      style={styles.applyBtn}
                    >
                      <Text style={styles.applyText}>APPLY</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  overlay: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    gap: 12,
  },
  filterMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  filterBtnLabel: {
    color: "#4ade80",
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
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
  headerTitleWrap: { flex: 1 },
  headerTitle: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 20,
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: "#4ade80",
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    marginTop: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterBar: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    padding: 4,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeFilterBtn: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  filterText: {
    color: "#64748b",
    fontFamily: Fonts.black,
    fontSize: 10,
  },
  activeFilterText: {
    color: "#22c55e",
  },
  dateControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  dateDisplay: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
  },
  dateText: {
    color: "#fff",
    fontFamily: Fonts.extraBold,
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  metricTile: {
    width: (SCREEN_W - 32 - 10) / 2,
    padding: 16,
    borderRadius: 14,
    borderLeftWidth: 3,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  tileLabel: {
    color: "#94a3b8",
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    textTransform: "uppercase",
  },
  tileValue: {
    fontFamily: Fonts.black,
    fontSize: 20,
  },
  chartCard: {
    padding: 20,
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
  },
  cardTitle: {
    color: "#94a3b8",
    fontFamily: Fonts.black,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 16,
  },
  progressRow: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 6,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 16,
  },
  progressSegment: { height: "100%" },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    color: "#94a3b8",
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderText: {
    color: "#64748b",
    fontFamily: Fonts.black,
    fontSize: 12,
    letterSpacing: 1,
  },
  seeAllText: {
    color: "#22c55e",
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  transactionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  txTitle: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  txSub: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 11,
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    color: "#22c55e",
    fontFamily: Fonts.black,
    fontSize: 15,
  },
  paidBadge: {
    backgroundColor: "rgba(34,197,94,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  paidText: {
    color: "#4ade80",
    fontFamily: Fonts.black,
    fontSize: 8,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalDismiss: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    width: Math.min(SCREEN_W * 0.9, 480),
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 18,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalSub: {
    color: "#4ade80",
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    marginTop: 2,
    textTransform: "uppercase",
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    paddingTop: 8,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 16,
  },
  orderLabel: {
    color: "#64748b",
    fontFamily: Fonts.black,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
  },
  itemsList: {
    maxHeight: 250,
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  orderItemQty: {
    color: "#22c55e",
    fontFamily: Fonts.black,
    fontSize: 14,
    width: 30,
  },
  orderItemName: {
    flex: 1,
    color: "#e2e8f0",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  orderItemPrice: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 14,
  },
  paymentSummary: {
    gap: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  totalLabel: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 16,
  },
  totalValue: {
    color: "#22c55e",
    fontFamily: Fonts.black,
    fontSize: 24,
  },
  paymentRowDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLabelDetail: {
    color: "#64748b",
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  paymentValueDetail: {
    color: "#fff",
    fontFamily: Fonts.extraBold,
    fontSize: 13,
  },
  doneBtn: {
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  doneBtnText: {
    color: "#4ade80",
    fontFamily: Fonts.black,
    fontSize: 14,
    letterSpacing: 1,
  },

  /* SIDEBAR */
  sidebarOverlay: {
    flex: 1,
    flexDirection: "row-reverse",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sidebarDismiss: { flex: 1 },
  sidebarContent: {
    width: Math.min(SCREEN_W * 0.8, 320),
    height: "100%",
    backgroundColor: "#0f172a",
    padding: 24,
    paddingTop: 60,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.1)",
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  sidebarTitle: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 16,
    letterSpacing: 1,
  },
  sidebarSection: { marginBottom: 24 },
  sectionLabel: {
    color: "#475569",
    fontFamily: Fonts.black,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 12,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  activeChip: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  chipText: { color: "#64748b", fontFamily: Fonts.bold, fontSize: 12 },
  activeChipText: { color: "#22c55e" },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 8,
  },
  activeSortBtn: {
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  sortText: { color: "#64748b", fontFamily: Fonts.bold, fontSize: 13 },
  activeSortText: { color: "#f1f5f9" },
  sidebarFooter: {
    marginTop: "auto",
    gap: 12,
  },
  applyBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyText: { color: "#052b12", fontFamily: Fonts.black, fontSize: 14 },
  resetBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  resetText: { color: "#64748b", fontFamily: Fonts.bold, fontSize: 12 },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  badgeText: { color: "#22c55e", fontFamily: Fonts.black, fontSize: 9, letterSpacing: 0.5 },
});