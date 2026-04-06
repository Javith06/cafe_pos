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
import { PieChart } from "react-native-gifted-charts";
import { API_URL } from "@/constants/Config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Fonts } from "../constants/Fonts";
import { useToast } from "../components/Toast";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type FilterType = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export default function SalesReport() {
  const router = useRouter();
  const { showToast } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  // Always default to today's date for daily view
  const todayDate = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayDate);
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
      // Avoid flickering: Only show full loading spinner if we have NO sales data yet
      if (sales.length === 0) setLoading(true);
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
    // First filter by date range based on selected filter
    let dateScopedSales = sales;
    
    if (selectedFilter === "DAILY") {
      // Filter to only today's sales
      dateScopedSales = sales.filter(s => {
        if (!s.SettlementDate) return false;
        const saleDate = s.SettlementDate.split("T")[0];
        return saleDate === selectedDate;
      });
    } else if (selectedFilter === "WEEKLY") {
      // Filter to this week's sales (last 7 days)
      const selectedDateObj = new Date(selectedDate);
      const sevenDaysAgo = new Date(selectedDateObj.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateScopedSales = sales.filter(s => {
        if (!s.SettlementDate) return false;
        const saleDate = new Date(s.SettlementDate);
        return saleDate >= sevenDaysAgo && saleDate <= selectedDateObj;
      });
    } else if (selectedFilter === "MONTHLY") {
      // Filter to this month's sales
      const selectedDateObj = new Date(selectedDate);
      const firstDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1);
      const lastDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth() + 1, 0);
      dateScopedSales = sales.filter(s => {
        if (!s.SettlementDate) return false;
        const saleDate = new Date(s.SettlementDate);
        return saleDate >= firstDay && saleDate <= lastDay;
      });
    }

    // Then apply payment mode and order type filters
    const filtered = dateScopedSales.filter((s) => {
       const modeMatch = activePaymentModes.includes(s.PayMode);
       const typeMatch = activeOrderTypes.length === 2 || (s.OrderType ? activeOrderTypes.includes(s.OrderType) : activeOrderTypes.includes("DINE-IN"));
       return modeMatch && typeMatch;
    });

    if (sortOrder === "NEWEST") {
      return [...filtered].sort((a, b) => new Date(b.SettlementDate).getTime() - new Date(a.SettlementDate).getTime());
    } else {
      return [...filtered].sort((a, b) => b.SysAmount - a.SysAmount);
    }
  }, [sales, selectedFilter, selectedDate, activePaymentModes, activeOrderTypes, sortOrder]);

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

  /** Rows for donut center labels (RN Text — avoids SvgText clipping / visibility issues). */
  const paymentMixCenterRows = useMemo(() => {
    const rows: { key: string; pct: number; color: string }[] = [];
    if (filteredMetrics.Cash > 0) rows.push({ key: "CASH", pct: paymentMix.cash, color: "#22c55e" });
    if (filteredMetrics.Card > 0) rows.push({ key: "CARD", pct: paymentMix.card, color: "#818cf8" });
    if (filteredMetrics.Nets > 0) rows.push({ key: "NETS", pct: paymentMix.nets, color: "#3b82f6" });
    if (filteredMetrics.PayNow > 0) rows.push({ key: "DIGITAL", pct: paymentMix.paynow, color: "#f59e0b" });
    return rows.sort((a, b) => b.pct - a.pct);
  }, [filteredMetrics, paymentMix]);

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
            {/* Header with Title and Year */}
            <View style={styles.dashboardHeader}>
              <View style={styles.headerContent}>
                <Text style={styles.dashboardYear}>{new Date().getFullYear()}</Text>
                <Text style={styles.dashboardTitle}>SALES ANALYTICS</Text>
                <Text style={styles.dashboardSubtitle}>Comprehensive performance dashboard</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                  <Text style={styles.backBtnLabel}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowFilterPanel(true)}
                  style={styles.filterMenuBtn}
                >
                  <Ionicons name="filter-outline" size={20} color="#22c55e" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Active Badges */}
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

              {/* Key Metrics Grid - 2x2 */}
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

              {/* Charts Section - Three columns like the reference */}
              <View style={styles.chartsContainer}>
                {/* Payment Channel Mix - Pie Chart */}
                <View style={[styles.chartCard, styles.chartCardWide]}>
                  <View style={styles.chartCardHeader}>
                    <Text style={styles.cardTitle}>PAYMENT CHANNEL MIX</Text>
                    <Ionicons name="pie-chart" size={14} color="#22c55e" />
                  </View>
                  <View style={styles.chartContainer}>
                    {filteredMetrics.TotalSales > 0 ? (
                      <View style={styles.pieChartWrapper}>
                        <PieChart
                          data={[
                            { value: filteredMetrics.Cash, color: "#22c55e", label: "CASH" },
                            { value: filteredMetrics.Card, color: "#818cf8", label: "CARD" },
                            { value: filteredMetrics.Nets, color: "#3b82f6", label: "NETS" },
                            { value: filteredMetrics.PayNow, color: "#f59e0b", label: "DIGITAL" },
                          ].filter((d) => d.value > 0)}
                          donut
                          radius={70}
                          innerRadius={50}
                          innerCircleColor="#0f172a"
                          showText={false}
                          strokeColor="#0f172a"
                          strokeWidth={2}
                          centerLabelComponent={() => (
                            <View style={styles.pieDonutCenter}>
                              {paymentMixCenterRows.map((row) => (
                                <Text
                                  key={row.key}
                                  style={styles.pieDonutCenterLine}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.85}
                                >
                                  <Text style={[styles.pieDonutCenterPct, { color: row.color }]}>
                                    {row.pct.toFixed(0)}%
                                  </Text>
                                  <Text style={styles.pieDonutCenterTag}> {row.key}</Text>
                                </Text>
                              ))}
                            </View>
                          )}
                        />
                      </View>
                    ) : (
                      <View style={styles.emptyChartPlaceholder}>
                        <Ionicons name="pie-chart-outline" size={40} color="#64748b" />
                        <Text style={styles.emptyChartText}>No sales data</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.legendContainer}>
                    {paymentMix.cash > 0 && (
                      <View style={styles.legendItemSmall}>
                        <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                        <Text style={styles.legendTextSmall}>CASH {paymentMix.cash.toFixed(0)}%</Text>
                      </View>
                    )}
                    {paymentMix.card > 0 && (
                      <View style={styles.legendItemSmall}>
                        <View style={[styles.dot, { backgroundColor: "#818cf8" }]} />
                        <Text style={styles.legendTextSmall}>CARD {paymentMix.card.toFixed(0)}%</Text>
                      </View>
                    )}
                    {paymentMix.nets > 0 && (
                      <View style={styles.legendItemSmall}>
                        <View style={[styles.dot, { backgroundColor: "#3b82f6" }]} />
                        <Text style={styles.legendTextSmall}>NETS {paymentMix.nets.toFixed(0)}%</Text>
                      </View>
                    )}
                    {paymentMix.paynow > 0 && (
                      <View style={styles.legendItemSmall}>
                        <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                        <Text style={styles.legendTextSmall}>DIGITAL {paymentMix.paynow.toFixed(0)}%</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Order Type Distribution */}
                <View style={styles.chartCard}>
                  <View style={styles.chartCardHeader}>
                    <Text style={styles.cardTitle}>ORDER TYPES</Text>
                    <Ionicons name="layers-outline" size={14} color="#3b82f6" />
                  </View>
                  <View style={styles.orderTypeStats}>
                    {(() => {
                      const dineIn = sales.filter(s => !s.OrderType || s.OrderType === "DINE-IN").length;
                      const takeaway = sales.filter(s => s.OrderType === "TAKEAWAY").length;
                      const total = dineIn + takeaway;
                      return (
                        <>
                          <View style={styles.statRow}>
                            <View style={styles.statLabel}>
                              <Text style={styles.statIcon}>🪑</Text>
                              <Text style={styles.statName}>Dine-In</Text>
                            </View>
                            <Text style={[styles.statValue, { color: "#3b82f6" }]}>
                              {total > 0 ? ((dineIn / total) * 100).toFixed(0) : 0}%
                            </Text>
                          </View>
                          <View style={styles.statRow}>
                            <View style={styles.statLabel}>
                              <Text style={styles.statIcon}>🛍️</Text>
                              <Text style={styles.statName}>Takeaway</Text>
                            </View>
                            <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                              {total > 0 ? ((takeaway / total) * 100).toFixed(0) : 0}%
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </View>

                {/* Performance Metrics */}
                <View style={styles.chartCard}>
                  <View style={styles.chartCardHeader}>
                    <Text style={styles.cardTitle}>KEY METRICS</Text>
                    <Ionicons name="bar-chart-outline" size={14} color="#ec4899" />
                  </View>
                  <View style={styles.metricsStats}>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Conversion</Text>
                      <Text style={styles.metricValueSmall}>{filteredMetrics.TotalTransactions}</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Avg Items</Text>
                      <Text style={styles.metricValueSmall}>
                        {filteredMetrics.TotalTransactions > 0 
                          ? (filteredMetrics.TotalItems / filteredMetrics.TotalTransactions).toFixed(1) 
                          : 0}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Per Item</Text>
                      <Text style={styles.metricValueSmall}>
                        {formatCurrency(filteredMetrics.TotalItems > 0 
                          ? filteredMetrics.TotalSales / filteredMetrics.TotalItems 
                          : 0)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Payment Method Breakdown */}
              <View style={styles.breakdownCard}>
                <View style={styles.chartCardHeader}>
                  <Text style={styles.cardTitle}>PAYMENT BREAKDOWN</Text>
                  <Ionicons name="wallet-outline" size={14} color="#22c55e" />
                </View>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownIcon}>💵</Text>
                    <Text style={styles.breakdownLabel}>CASH</Text>
                    <Text style={[styles.breakdownValue, { color: "#22c55e" }]}>
                      {formatCurrency(filteredMetrics.Cash)}
                    </Text>
                  </View>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownIcon}>💳</Text>
                    <Text style={styles.breakdownLabel}>CARD</Text>
                    <Text style={[styles.breakdownValue, { color: "#818cf8" }]}>
                      {formatCurrency(filteredMetrics.Card)}
                    </Text>
                  </View>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownIcon}>🔳</Text>
                    <Text style={styles.breakdownLabel}>NETS</Text>
                    <Text style={[styles.breakdownValue, { color: "#3b82f6" }]}>
                      {formatCurrency(filteredMetrics.Nets)}
                    </Text>
                  </View>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownIcon}>📱</Text>
                    <Text style={styles.breakdownLabel}>DIGITAL</Text>
                    <Text style={[styles.breakdownValue, { color: "#f59e0b" }]}>
                      {formatCurrency(filteredMetrics.PayNow)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Recent Activity Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>RECENT TRANSACTIONS</Text>
                <TouchableOpacity onPress={() => fetchData()}>
                  <Text style={styles.seeAllText}>REFRESH</Text>
                </TouchableOpacity>
              </View>

              {filteredSales.slice(0, 15).map((item, idx) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={idx}
                  onPress={() => handleOrderPress(item)}
                  style={styles.transactionCard}
                >
                  {/* Icon */}
                  <View style={styles.txIconWrap}>
                    <Ionicons 
                      name={item.PayMode === "CASH" ? "cash-outline" : item.PayMode === "NETS" ? "card-outline" : item.PayMode === "CARD" ? "card-outline" : "qr-code-outline"} 
                      size={16} 
                      color={
                        item.PayMode === "CASH" ? "#22c55e" : 
                        item.PayMode === "CARD" ? "#818cf8" : 
                        item.PayMode === "NETS" ? "#3b82f6" : 
                        "#f59e0b"
                      } 
                    />
                  </View>
                  
                  {/* Order ID & Type */}
                  <View style={styles.txOrderInfo}>
                    <Text style={styles.txTitle}>{item.OrderType === "TAKEAWAY" ? "🛍️ Takeaway" : item.TableNo ? `🪑 Table ${item.TableNo}` : "🪑 Dine-In"}</Text>
                    <Text style={styles.txSmall}>Order #{item.OrderId || item.BillNo?.slice(-6) || "N/A"}</Text>
                  </View>
                  
                  {/* Date & Time */}
                  <View style={styles.txTimeInfo}>
                    <Text style={styles.txDatetime}>{new Date(item.SettlementDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(item.SettlementDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  
                  {/* Payment Mode */}
                  <View style={styles.txPaymentInfo}>
                    <Text style={[styles.txPaymode, {
                      color: item.PayMode === "CASH" ? "#22c55e" : 
                             item.PayMode === "CARD" ? "#818cf8" : 
                             item.PayMode === "NETS" ? "#3b82f6" : 
                             "#f59e0b"
                    }]}>
                      {item.PayMode}
                    </Text>
                  </View>
                  
                  {/* Items Count */}
                  <Text style={styles.txItemCountSmall}>{item.ReceiptCount || 0}x</Text>
                  
                  {/* Amount & Status */}
                  <View style={styles.txRightInfo}>
                    <Text style={styles.txAmount}>{formatCurrency(item.SysAmount)}</Text>
                    <View style={styles.paidBadgeSmall}>
                      <Ionicons name="checkmark" size={10} color="#22c55e" />
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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>Order #{selectedOrder?.OrderId || selectedOrder?.BillNo?.slice(-6) || "N/A"}</Text>
                      <Text style={styles.modalSub}>{new Date(selectedOrder?.SettlementDate).toLocaleString()}</Text>
                      {selectedOrder?.OrderType && (
                        <Text style={[styles.modalSub, { marginTop: 4, color: "#3b82f6" }]}>
                          {selectedOrder.OrderType === "TAKEAWAY" ? "🛍️ Takeaway" : "🪑 Dine-In"}
                          {selectedOrder.TableNo ? ` • Table ${selectedOrder.TableNo}` : ""}
                          {selectedOrder.Section ? ` • ${selectedOrder.Section}` : ""}
                        </Text>
                      )}
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
                        <Text style={styles.totalValue}>{formatCurrency(selectedOrder?.SysAmount)}</Text>
                      </View>
                      <View style={styles.paymentRowDetail}>
                        <Text style={styles.paymentLabelDetail}>Payment Mode</Text>
                        <Text style={styles.paymentValueDetail}>{selectedOrder?.PayMode}</Text>
                      </View>
                      <View style={styles.paymentRowDetail}>
                        <Text style={styles.paymentLabelDetail}>Items Sold</Text>
                        <Text style={styles.paymentValueDetail}>{selectedOrder?.ReceiptCount} item(s)</Text>
                      </View>
                      <View style={styles.paymentRowDetail}>
                        <Text style={styles.paymentLabelDetail}>Status</Text>
                        <Text style={[styles.paymentValueDetail, { color: "#22c55e" }]}>Settled ✅</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      onPress={() => setSelectedOrder(null)}
                      style={[styles.doneBtn, { flex: 1 }]}
                    >
                      <Text style={styles.doneBtnText}>CLOSE</Text>
                    </TouchableOpacity>
                  </View>
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
  
  /* Dashboard Header */
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 20,
    gap: 16,
  },
  headerContent: { flex: 1 },
  dashboardYear: {
    color: "#4ade80",
    fontFamily: Fonts.black,
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 4,
  },
  dashboardTitle: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 28,
    letterSpacing: 1.2,
  },
  dashboardSubtitle: {
    color: "#94a3b8",
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  filterMenuBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(34,197,94,0.1)",
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backBtnLabel: {
    color: "#f8fafc",
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  
  /* Badge Row */
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  badgeText: {
    color: "#22c55e",
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  
  /* Filter Bar */
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
  
  /* Date Control */
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
  
  /* Metrics Grid */
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
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
  
  /* Charts Container - Grid Layout */
  chartsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  chartCard: {
    flex: 1,
    minWidth: (SCREEN_W - 32 - 12) / 2,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
  },
  chartCardWide: {
    width: "100%",
  },
  chartCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    color: "#94a3b8",
    fontFamily: Fonts.black,
    fontSize: 11,
    letterSpacing: 1,
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  pieChartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  pieDonutCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    gap: 4,
    maxWidth: 96,
  },
  pieDonutCenterLine: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    textAlign: "center",
  },
  pieDonutCenterPct: {
    fontFamily: Fonts.black,
    fontSize: 12,
  },
  pieDonutCenterTag: {
    color: "#cbd5e1",
    fontFamily: Fonts.semiBold,
    fontSize: 9,
  },
  emptyChartPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    gap: 12,
  },
  emptyChartText: {
    color: "#64748b",
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  
  /* Legend Container */
  legendContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 12,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  legendItemSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendTextSmall: {
    color: "#94a3b8",
    fontFamily: Fonts.semiBold,
    fontSize: 10,
  },
  legendText: {
    color: "#94a3b8",
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  
  /* Order Type Stats */
  orderTypeStats: {
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  statLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    fontSize: 18,
  },
  statName: {
    color: "#e2e8f0",
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  statValue: {
    fontFamily: Fonts.black,
    fontSize: 16,
  },
  
  /* Metrics Stats */
  metricsStats: {
    gap: 10,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  metricLabel: {
    color: "#64748b",
    fontFamily: Fonts.semiBold,
    fontSize: 11,
  },
  metricValueSmall: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 14,
  },
  
  /* Breakdown Card */
  breakdownCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  breakdownItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  breakdownIcon: {
    fontSize: 24,
  },
  breakdownLabel: {
    color: "#64748b",
    fontFamily: Fonts.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  breakdownValue: {
    fontFamily: Fonts.black,
    fontSize: 11,
  },
  
  /* Section Header */
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
  
  /* Transaction Card */
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    gap: 10,
  },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  txOrderInfo: {
    flex: 1.2,
    minWidth: 100,
  },
  txTitle: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  txSmall: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 9,
    marginTop: 1,
  },
  txTimeInfo: {
    flex: 1,
    minWidth: 90,
  },
  txDatetime: {
    color: "#e2e8f0",
    fontFamily: Fonts.semiBold,
    fontSize: 11,
  },
  txPaymentInfo: {
    flex: 0.75,
    minWidth: 65,
  },
  txPaymode: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  txItemCountSmall: {
    color: "#94a3b8",
    fontFamily: Fonts.bold,
    fontSize: 10,
    minWidth: 30,
    textAlign: "center",
  },
  txRightInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  txAmount: {
    color: "#22c55e",
    fontFamily: Fonts.black,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  paidBadgeSmall: {
    backgroundColor: "rgba(34,197,94,0.15)",
    padding: 4,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  txTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  txIdSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1.5,
  },
  txTimeSection: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  txDate: {
    color: "#94a3b8",
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  txTime: {
    color: "#e2e8f0",
    fontFamily: Fonts.bold,
    fontSize: 13,
    marginTop: 2,
  },
  txAmountSection: {
    alignItems: "flex-end",
    flex: 1,
    gap: 6,
  },
  paidBadge: {
    backgroundColor: "rgba(34,197,94,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  paidText: {
    color: "#4ade80",
    fontFamily: Fonts.black,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  txBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  paymentModeTag: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  paymentModeTagText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  txItemCount: {
    color: "#94a3b8",
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
  txSection: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
  txSub: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 11,
    marginTop: 2,
  },
  txDetails: {
    color: "#475569",
    fontFamily: Fonts.medium,
    fontSize: 10,
    marginTop: 3,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  txRight: {
    alignItems: "flex-end",
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

  /* CANCELLED ORDERS */
  cancelledCard: {
    opacity: 0.6,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
  },
  cancelledBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  cancelledBadgeText: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  cancelledText: {
    color: "#999",
    textDecorationLine: "line-through",
  },
  cancelledStatusBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },

  /* TOGGLE BUTTON */
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "transparent",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "#ef4444",
  },
  toggleBtnText: {
    color: "#999",
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  toggleBtnTextActive: {
    color: "#ef4444",
  },

  /* MODAL FOOTER */
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  cancelOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelOrderBtnText: {
    color: "#fff",
    fontFamily: Fonts.semiBold,
    fontSize: 13,
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
});