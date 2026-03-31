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
  TextInput,
  FlatList,
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

type FilterType = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
type DateRangeMode = "SINGLE" | "RANGE";

// Pure function outside the component — no stale closure risk
function computeEffectiveDateRange(
  dateRangeMode: DateRangeMode,
  startDate: string,
  endDate: string,
  selectedDate: string,
  selectedFilter: FilterType
): { start: string; end: string } {
  if (dateRangeMode === "RANGE") {
    return { start: startDate, end: endDate };
  }
  const s = new Date(selectedDate);
  const e = new Date(selectedDate);
  if (selectedFilter === "WEEKLY") {
    s.setDate(s.getDate() - 6);
  } else if (selectedFilter === "MONTHLY") {
    s.setDate(1);
    e.setMonth(e.getMonth() + 1, 0);
  } else if (selectedFilter === "YEARLY") {
    s.setMonth(0, 1);
    e.setMonth(11, 31);
  }
  return {
    start: s.toISOString().split("T")[0],
    end: e.toISOString().split("T")[0],
  };
}

export default function SalesReport() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("MONTHLY");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRangeMode, setDateRangeMode] = useState<DateRangeMode>("SINGLE");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [activePaymentModes, setActivePaymentModes] = useState<string[]>(["CASH", "CARD", "NETS", "PAYNOW"]);
  const [activeOrderTypes, setActiveOrderTypes] = useState<string[]>(["DINE-IN", "TAKEAWAY"]);
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "HIGHEST">("NEWEST");
  const [searchQuery, setSearchQuery] = useState("");

  const isTablet = SCREEN_W >= 768;

  // Persistence: Load on mount — does NOT trigger fetchData
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedDate = await AsyncStorage.getItem("sales_selected_date");
        const savedStartDate = await AsyncStorage.getItem("sales_start_date");
        const savedEndDate = await AsyncStorage.getItem("sales_end_date");
        const savedFilter = await AsyncStorage.getItem("sales_selected_filter");
        const savedModes = await AsyncStorage.getItem("sales_payment_modes");
        const savedTypes = await AsyncStorage.getItem("sales_order_types");
        const savedSort = await AsyncStorage.getItem("sales_sort_order");
        const savedRangeMode = await AsyncStorage.getItem("sales_range_mode");

        if (savedDate) setSelectedDate(savedDate);
        if (savedStartDate) setStartDate(savedStartDate);
        if (savedEndDate) setEndDate(savedEndDate);
        if (savedFilter) setSelectedFilter(savedFilter as FilterType);
        if (savedModes) setActivePaymentModes(JSON.parse(savedModes));
        if (savedTypes) setActiveOrderTypes(JSON.parse(savedTypes));
        if (savedSort) setSortOrder(savedSort as "NEWEST" | "HIGHEST");
        if (savedRangeMode) setDateRangeMode(savedRangeMode as DateRangeMode);
      } catch (e) {
        console.error("Load state error:", e);
      } finally {
        setStateLoaded(true);
      }
    };
    loadState();
  }, []);

  // Only fetch after persisted state has been loaded — avoids double-fetch on mount
  useEffect(() => {
    if (!stateLoaded) return;
    AsyncStorage.setItem("sales_selected_date", selectedDate);
    AsyncStorage.setItem("sales_start_date", startDate);
    AsyncStorage.setItem("sales_end_date", endDate);
    AsyncStorage.setItem("sales_selected_filter", selectedFilter);
    AsyncStorage.setItem("sales_payment_modes", JSON.stringify(activePaymentModes));
    AsyncStorage.setItem("sales_order_types", JSON.stringify(activeOrderTypes));
    AsyncStorage.setItem("sales_sort_order", sortOrder);
    AsyncStorage.setItem("sales_range_mode", dateRangeMode);
    fetchData();
  }, [stateLoaded, selectedDate, startDate, endDate, selectedFilter, dateRangeMode, activePaymentModes, activeOrderTypes, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Compute range once here and pass it down — prevents stale closure bugs
      const range = computeEffectiveDateRange(
        dateRangeMode,
        startDate,
        endDate,
        selectedDate,
        selectedFilter
      );
      await Promise.all([fetchSales(range), fetchSummary(range)]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const fetchSales = async (range: { start: string; end: string }) => {
    try {
      const { start, end } = range;
      console.log(`Fetching transactions: ${start} → ${end}`);
      const response = await fetch(`${API_URL}/api/sales/transactions?startDate=${start}&endDate=${end}`);
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

  const fetchSummary = async (range: { start: string; end: string }) => {
    try {
      const { start, end } = range;

      if (selectedFilter === "DAILY" && dateRangeMode !== "RANGE") {
        // Single day — use the fast daily endpoint
        const url = `${API_URL}/api/sales/daily/${start}`;
        const response = await fetch(url);
        const data = await response.json();
        setSummary(data);
      } else {
        // Multi-day range
        const url = `${API_URL}/api/sales/range?startDate=${start}&endDate=${end}`;
        const response = await fetch(url);
        const data = await response.json();

        if (Array.isArray(data)) {
          const aggregated = data.reduce((acc, curr) => ({
            TotalTransactions: acc.TotalTransactions + (curr.TotalTransactions || 0),
            TotalSales: acc.TotalSales + (curr.TotalSales || 0),
            CashSales: acc.CashSales + (curr.CashSales || 0),
            NETS_Sales: acc.NETS_Sales + (curr.NETS_Sales || 0),
            PayNow_Sales: acc.PayNow_Sales + (curr.PayNow_Sales || 0),
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

  // Returns "Mar 31, 10:30 AM" format — date + time together
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      const datePart = date.toLocaleDateString([], { month: "short", day: "numeric" });
      const timePart = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      return `${datePart}  ${timePart}`;
    } catch {
      return "N/A";
    }
  };

  const formatTimeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${time}`;
    } catch {
      return "N/A";
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case "PAID":
        return "#22c55e";
      case "PENDING":
        return "#f59e0b";
      case "FAILED":
        return "#ef4444";
      default:
        return "#22c55e";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch(method?.toUpperCase()) {
      case "CASH":
        return "cash-outline";
      case "CARD":
      case "NETS":
        return "card-outline";
      case "PAYNOW":
      case "UPI":
        return "qr-code-outline";
      default:
        return "wallet-outline";
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  };

  // CLIENT-SIDE FILTERING & SORTING
  // NOTE: sales[] is already date-filtered from the API. This adds payment/type/search/sort on top.
  const filteredSales = useMemo(() => {
    let filtered = sales.filter((s) => {
      const modeMatch = activePaymentModes.length === 0 || activePaymentModes.includes(s.PayMode);
      const typeMatch =
        activeOrderTypes.length === 2 ||
        (s.OrderType
          ? activeOrderTypes.includes(s.OrderType)
          : activeOrderTypes.includes("DINE-IN"));
      return modeMatch && typeMatch;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase();
      filtered = filtered.filter(
        (s) =>
          (s.BillNo && s.BillNo.toString().toUpperCase().includes(q)) ||
          (s.SettlementID && s.SettlementID.toString().toUpperCase().includes(q))
      );
    }

    if (sortOrder === "NEWEST") {
      return [...filtered].sort(
        (a, b) => new Date(b.SettlementDate).getTime() - new Date(a.SettlementDate).getTime()
      );
    } else {
      return [...filtered].sort((a, b) => b.SysAmount - a.SysAmount);
    }
  }, [sales, activePaymentModes, activeOrderTypes, sortOrder, searchQuery]);

  // Metrics derived entirely from the already-filtered & date-correct filteredSales list
  const filteredMetrics = useMemo(() => {
    const filtered = filteredSales;
    return {
      TotalSales: filtered.reduce((acc, s) => acc + (s.SysAmount || 0), 0),
      TotalTransactions: filtered.length,
      TotalItems: filtered.reduce((acc, s) => acc + (s.ReceiptCount || 0), 0),
      Cash: filtered.filter((s) => s.PayMode === "CASH").reduce((acc, s) => acc + (s.SysAmount || 0), 0),
      Card: filtered.filter((s) => s.PayMode === "CARD").reduce((acc, s) => acc + (s.SysAmount || 0), 0),
      Nets: filtered.filter((s) => s.PayMode === "NETS").reduce((acc, s) => acc + (s.SysAmount || 0), 0),
      PayNow: filtered.filter((s) => s.PayMode === "PAYNOW").reduce((acc, s) => acc + (s.SysAmount || 0), 0),
    };
  }, [filteredSales]);

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

              {/* Date Filter Controls */}
              <View style={styles.dateFilterSection}>
                <View style={styles.dateFilterHeader}>
                  <View>
                    <Text style={styles.dateFilterLabel}>SELECT DATE RANGE</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={styles.editDateBtn}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#22c55e" />
                  </TouchableOpacity>
                </View>

                <View style={styles.dateRangeDisplay}>
                  <View style={styles.dateRangeItem}>
                    <Text style={styles.dateRangeLabel}>From</Text>
                    <Text style={styles.dateRangeValue}>{startDate}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#64748b" style={styles.dateArrow} />
                  <View style={styles.dateRangeItem}>
                    <Text style={styles.dateRangeLabel}>To</Text>
                    <Text style={styles.dateRangeValue}>{endDate}</Text>
                  </View>
                </View>
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

              {/* Sales Table */}
              <View style={styles.tableSection}>
                {/* SEARCH BAR */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search Bill ID"
                    placeholderTextColor="#475569"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="characters"
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>ID</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>DATE & TIME</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>PAYMENT</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: "right" }]}>STATUS</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: "right" }]}>AMOUNT</Text>
                  </View>

                  {filteredSales.length === 0 && searchQuery.length > 0 ? (
                    <View style={styles.noResultsContainer}>
                      <Ionicons name="search-outline" size={48} color="#475569" />
                      <Text style={styles.noResultsTitle}>No matching transactions found</Text>
                      <Text style={styles.noResultsDesc}>Try searching for a different ID or adjust filters</Text>
                    </View>
                  ) : filteredSales.length === 0 ? (
                    <View style={styles.noResultsContainer}>
                      <Ionicons name="cash-outline" size={48} color="#475569" />
                      <Text style={styles.noResultsTitle}>No sales data available</Text>
                      <Text style={styles.noResultsDesc}>Select a different date range or refresh</Text>
                    </View>
                  ) : (
                    <View style={styles.tableBody}>
                      {filteredSales.map((item, idx) => (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          key={idx}
                          onPress={() => handleOrderPress(item)}
                          style={[
                            styles.tableRow,
                            idx % 2 === 0 && styles.tableRowAlternate,
                          ]}
                        >
                          <Text style={[styles.tableCell, { flex: 0.8 }]} numberOfLines={1}>
                            {item.BillNo || item.SettlementID?.slice(0, 8) || "N/A"}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={2}>
                            {formatDateTime(item.SettlementDate)}
                          </Text>
                          <View style={[styles.tableCellFlex, { flex: 0.9 }]}>
                            <Ionicons
                              name={getPaymentMethodIcon(item.PayMode)}
                              size={14}
                              color="#94a3b8"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.tableCell} numberOfLines={1}>
                              {item.PayMode || "N/A"}
                            </Text>
                          </View>
                          <View style={[styles.tableCellFlex, { flex: 0.8, justifyContent: "flex-end" }]}>
                            <View
                              style={[
                                styles.statusBadge,
                                { borderColor: getStatusColor(item.Status || "PAID"), backgroundColor: getStatusColor(item.Status || "PAID") + "20" },
                              ]}
                            >
                              <Text style={[styles.statusText, { color: getStatusColor(item.Status || "PAID") }]}>
                                {(item.Status || "PAID").toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.tableCell, styles.amountCell, { flex: 0.8, textAlign: "right" }]} numberOfLines={1}>
                            {formatCurrency(item.SysAmount)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
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
                      <Text style={styles.modalTitle}># {selectedOrder?.BillNo || selectedOrder?.SettlementID?.slice(0, 8)}</Text>
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

            {/* DATE PICKER MODAL */}
            <Modal
              visible={showDatePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <BlurView intensity={15} tint="dark" style={styles.modalOverlay}>
                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.modalDismiss}
                  onPress={() => setShowDatePicker(false)}
                />
                <View style={styles.datePickerModal}>
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerTitle}>SELECT DATE RANGE</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.datePickerDivider} />

                  <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {/* Mode Selection */}
                    <View style={styles.datePickerSection}>
                      <Text style={styles.datePickerLabel}>RANGE TYPE</Text>
                      <View style={styles.dateModeRow}>
                        <TouchableOpacity
                          onPress={() => setDateRangeMode("SINGLE")}
                          style={[
                            styles.dateModeBtn,
                            dateRangeMode === "SINGLE" && styles.dateModeBtnActive,
                          ]}
                        >
                          <Ionicons
                            name={dateRangeMode === "SINGLE" ? "radio-button-on" : "radio-button-off"}
                            size={18}
                            color={dateRangeMode === "SINGLE" ? "#22c55e" : "#64748b"}
                          />
                          <Text
                            style={[
                              styles.dateModeBtnText,
                              dateRangeMode === "SINGLE" && styles.dateModeBtnTextActive,
                            ]}
                          >
                            Single Date
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setDateRangeMode("RANGE")}
                          style={[
                            styles.dateModeBtn,
                            dateRangeMode === "RANGE" && styles.dateModeBtnActive,
                          ]}
                        >
                          <Ionicons
                            name={dateRangeMode === "RANGE" ? "radio-button-on" : "radio-button-off"}
                            size={18}
                            color={dateRangeMode === "RANGE" ? "#22c55e" : "#64748b"}
                          />
                          <Text
                            style={[
                              styles.dateModeBtnText,
                              dateRangeMode === "RANGE" && styles.dateModeBtnTextActive,
                            ]}
                          >
                            Date Range
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Date Input Fields */}
                    <View style={styles.datePickerSection}>
                      <Text style={styles.datePickerLabel}>START DATE</Text>
                      <View style={styles.dateInputContainer}>
                        <Ionicons name="calendar-outline" size={16} color="#22c55e" />
                        <TextInput
                          style={styles.dateInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#475569"
                          value={startDate}
                          onChangeText={setStartDate}
                        />
                      </View>
                    </View>

                    {dateRangeMode === "RANGE" && (
                      <View style={styles.datePickerSection}>
                        <Text style={styles.datePickerLabel}>END DATE</Text>
                        <View style={styles.dateInputContainer}>
                          <Ionicons name="calendar-outline" size={16} color="#22c55e" />
                          <TextInput
                            style={styles.dateInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#475569"
                            value={endDate}
                            onChangeText={setEndDate}
                          />
                        </View>
                      </View>
                    )}

                    {/* Quick Select Buttons */}
                    <View style={styles.datePickerSection}>
                      <Text style={styles.datePickerLabel}>QUICK SELECT</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const today = new Date().toISOString().split("T")[0];
                          setStartDate(today);
                          setEndDate(today);
                          setDateRangeMode("SINGLE");
                        }}
                        style={styles.quickSelectBtn}
                      >
                        <Ionicons name="today-outline" size={16} color="#22c55e" />
                        <Text style={styles.quickSelectText}>Today</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          const today = new Date();
                          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                          setStartDate(yesterday.toISOString().split("T")[0]);
                          setEndDate(today.toISOString().split("T")[0]);
                          setDateRangeMode("RANGE");
                        }}
                        style={styles.quickSelectBtn}
                      >
                        <Ionicons name="time-outline" size={16} color="#22c55e" />
                        <Text style={styles.quickSelectText}>Last 2 Days</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          const today = new Date();
                          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                          setStartDate(weekAgo.toISOString().split("T")[0]);
                          setEndDate(today.toISOString().split("T")[0]);
                          setDateRangeMode("RANGE");
                        }}
                        style={styles.quickSelectBtn}
                      >
                        <Ionicons name="calendar-outline" size={16} color="#22c55e" />
                        <Text style={styles.quickSelectText}>Last 7 Days</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          const today = new Date();
                          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                          setStartDate(monthAgo.toISOString().split("T")[0]);
                          setEndDate(today.toISOString().split("T")[0]);
                          setDateRangeMode("RANGE");
                        }}
                        style={styles.quickSelectBtn}
                      >
                        <Ionicons name="calendar-outline" size={16} color="#22c55e" />
                        <Text style={styles.quickSelectText}>Last 30 Days</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <View style={styles.datePickerDivider} />

                  <View style={styles.datePickerFooter}>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={styles.datePickerCancelBtn}
                    >
                      <Text style={styles.datePickerCancelText}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowDatePicker(false);
                      }}
                      style={styles.datePickerApplyBtn}
                    >
                      <Text style={styles.datePickerApplyText}>APPLY</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
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
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 12,
    height: 50,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  noResultsTitle: {
    color: "#e2e8f0",
    fontFamily: Fonts.bold,
    fontSize: 18,
    marginTop: 8,
  },
  noResultsDesc: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 14,
    textAlign: "center",
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

  /* DATE FILTER SECTION */
  dateFilterSection: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  dateFilterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateFilterLabel: {
    color: "#94a3b8",
    fontFamily: Fonts.black,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  editDateBtn: {
    padding: 8,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  dateRangeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateRangeItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dateRangeLabel: {
    color: "#64748b",
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    marginBottom: 4,
  },
  dateRangeValue: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  dateArrow: {
    marginHorizontal: 4,
  },

  /* TABLE STYLES */
  tableSection: {
    marginBottom: 20,
  },
  tableContainer: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(34,197,94,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  tableHeaderCell: {
    color: "#22c55e",
    fontFamily: Fonts.black,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tableBody: {},
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  tableRowAlternate: {
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  tableCell: {
    color: "#e2e8f0",
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  tableCellFlex: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountCell: {
    color: "#22c55e",
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  statusText: {
    fontFamily: Fonts.black,
    fontSize: 9,
    letterSpacing: 0.5,
  },

  /* DATE PICKER MODAL */
  datePickerModal: {
    height: "75%",
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  datePickerTitle: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 18,
    letterSpacing: 1,
  },
  datePickerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 16,
  },
  datePickerSection: {
    marginBottom: 24,
  },
  datePickerLabel: {
    color: "#475569",
    fontFamily: Fonts.black,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  dateModeRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dateModeBtnActive: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  dateModeBtnText: {
    color: "#64748b",
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  dateModeBtnTextActive: {
    color: "#22c55e",
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 10,
  },
  dateInput: {
    flex: 1,
    color: "#fff",
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  quickSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
    marginBottom: 10,
  },
  quickSelectText: {
    color: "#22c55e",
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  datePickerFooter: {
    flexDirection: "row",
    gap: 12,
  },
  datePickerCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  datePickerCancelText: {
    color: "#64748b",
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  datePickerApplyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#22c55e",
    alignItems: "center",
  },
  datePickerApplyText: {
    color: "#052b12",
    fontFamily: Fonts.black,
    fontSize: 13,
    letterSpacing: 0.5,
  },
});