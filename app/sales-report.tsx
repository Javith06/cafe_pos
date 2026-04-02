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
  Animated,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Fonts } from "../constants/Fonts";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const API_URL = "https://cafepos-production-3428.up.railway.app";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarAnim = React.useRef(new Animated.Value(-280)).current;

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

  const toggleSidebar = () => {
    const toValue = isSidebarOpen ? -280 : 0;
    Animated.timing(sidebarAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderMetricTile = (
    label: string,
    value: string | number,
    icon: any,
    color: string,
    trend?: string,
  ) => (
    <View style={styles.metricCard}>
      <View style={[styles.cardIconBg, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardValue}>{value}</Text>
        {trend && (
          <View style={styles.trendRow}>
            <Ionicons name="trending-up" size={12} color="#10b981" />
            <Text style={styles.trendText}>{trend} vs last month</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* TOP DASHBOARD HEADER */}
        <View style={styles.dashboardHeader}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={toggleSidebar} style={styles.iconBtn}>
              <Ionicons name="menu-outline" size={26} color="#1e293b" />
            </TouchableOpacity>
            <View style={styles.titleArea}>
              <Text style={styles.mainTitle}>Sales Report</Text>
              <Text style={styles.mainSubtitle}>{selectedFilter} Tracking • {selectedDate}</Text>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={22} color="#64748b" />
            </TouchableOpacity>
            <View style={styles.profileBox}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>AD</Text>
              </View>
              {isTablet && (
                <View style={styles.profileText}>
                  <Text style={styles.profileName}>Admin Store</Text>
                  <Text style={styles.profileRole}>Manager</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ flex: 1, flexDirection: "row" }}>
          {/* COLLAPSIBLE SIDEBAR NAVIGATION */}
          <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
             <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarBrand}>Deal<Text style={{ color: "#4f46e5" }}>Deck</Text></Text>
                <TouchableOpacity onPress={toggleSidebar} style={styles.sidebarCloseBtn}>
                   <Ionicons name="chevron-back" size={20} color="#94a3b8" />
                </TouchableOpacity>
             </View>
             
             <ScrollView style={styles.sidebarNav} showsVerticalScrollIndicator={false}>
                <Text style={styles.sidebarSectionLabel}>MENU</Text>
                {[
                  { id: "dash", label: "Dashboard", icon: "grid-outline" },
                  { id: "report", label: "Report", icon: "bar-chart", active: true },
                  { id: "prod", label: "Products", icon: "cube-outline" },
                  { id: "cons", label: "Consumer", icon: "people-outline" }
                ].map(m => (
                  <TouchableOpacity key={m.id} style={[styles.navItem, m.active && styles.navItemActive]}>
                    <Ionicons name={m.icon as any} size={20} color={m.active ? "#fff" : "#94a3b8"} />
                    <Text style={[styles.navText, m.active && styles.navTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.sidebarSectionLabel, { marginTop: 25 }]}>FINANCIAL</Text>
                {[
                  { id: "tx", label: "Transactions", icon: "receipt-outline" },
                  { id: "inv", label: "Invoices", icon: "documents-outline" }
                ].map(m => (
                  <TouchableOpacity key={m.id} style={styles.navItem}>
                    <Ionicons name={m.icon as any} size={20} color="#94a3b8" />
                    <Text style={styles.navText}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
             </ScrollView>

             <View style={styles.sidebarFooter}>
                <TouchableOpacity style={styles.upgradeBtn}>
                   <Ionicons name="rocket-outline" size={18} color="#fff" />
                   <Text style={styles.upgradeText}>Upgrade Pro</Text>
                </TouchableOpacity>
             </View>
          </Animated.View>

          {/* MAIN TRANSACTIONAL CONTENT */}
          <ScrollView 
            style={styles.mainContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
          >
            {/* Range Pills */}
            <View style={styles.pillContainer}>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as FilterType[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setSelectedFilter(f)}
                    style={[styles.pillBtn, selectedFilter === f && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, selectedFilter === f && styles.pillTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.spacer} />
              
              <TouchableOpacity onPress={() => setShowFilterPanel(true)} style={styles.filterBtn}>
                <Ionicons name="options-outline" size={18} color="#4f46e5" />
                <Text style={styles.filterBtnText}>Filters</Text>
              </TouchableOpacity>
            </View>

            {/* Centered Date Navigation */}
            <View style={styles.dateControlRow}>
              <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navDateBtn}>
                <Ionicons name="chevron-back" size={20} color="#4f46e5" />
              </TouchableOpacity>
              <View style={styles.dateDisplayBox}>
                <Ionicons name="calendar-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.dateDisplayText}>{selectedDate}</Text>
              </View>
              <TouchableOpacity onPress={() => changeDate(1)} style={styles.navDateBtn}>
                <Ionicons name="chevron-forward" size={20} color="#4f46e5" />
              </TouchableOpacity>
            </View>

            {/* High-Level Metrics */}
            <View style={styles.metricsRow}>
              {renderMetricTile("Total Revenue", formatCurrency(filteredMetrics.TotalSales), "wallet-outline", "#4f46e5", "+2.0%")}
              {renderMetricTile("Avg Check", formatCurrency(avgOrder), "analytics-outline", "#3b82f6", "+1.1%")}
              {renderMetricTile("Orders", filteredMetrics.TotalTransactions, "receipt-outline", "#10b981", "+0.8%")}
              {renderMetricTile("Items", filteredMetrics.TotalItems, "cube-outline", "#f59e0b", "+12.1%")}
            </View>

            <View style={[styles.contentRow, { flexDirection: isTablet ? "row" : "column" }]}>
              {/* Payment Mix Breakdown */}
              <View style={[styles.statCard, { flex: 1.5 }]}>
                <Text style={styles.cardTitle}>Payment Distribution</Text>
                <View style={styles.circularChartPlaceholder}>
                   <View style={styles.ringOuter}>
                      <View style={styles.ringInner}>
                         <Text style={styles.centerValue}>{formatCurrency(filteredMetrics.TotalSales)}</Text>
                         <Text style={styles.centerLabel}>Total Sales</Text>
                      </View>
                   </View>
                </View>
                
                <View style={styles.legendGrid}>
                  {[
                    { label: "CASH", val: paymentMix.cash, color: "#10b981" },
                    { label: "CARD", val: paymentMix.card, color: "#818cf8" },
                    { label: "NETS", val: paymentMix.nets, color: "#3b82f6" },
                    { label: "PAYNOW", val: paymentMix.paynow, color: "#f59e0b" }
                  ].map(p => (
                    <View key={p.label} style={styles.legendEntry}>
                       <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                       <View>
                          <Text style={styles.legendLabel}>{p.label}</Text>
                          <Text style={styles.legendVal}>{p.val.toFixed(1)}%</Text>
                       </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Recent Transaction Log */}
              <View style={[styles.statCard, { flex: 2 }]}>
                <View style={styles.cardHeaderArea}>
                   <Text style={styles.cardTitle}>Recent Transactions</Text>
                   <TouchableOpacity onPress={() => fetchData()}>
                      <Text style={styles.viewAllText}>Refresh</Text>
                   </TouchableOpacity>
                </View>
                {filteredSales.slice(0, 10).map((item, idx) => (
                  <TouchableOpacity key={idx} onPress={() => handleOrderPress(item)} style={styles.activityRow}>
                    <View style={[styles.activityIcon, { backgroundColor: item.PayMode === "CASH" ? "#10b98115" : "#3b82f615" }]}>
                       <Ionicons 
                        name={item.PayMode === "CASH" ? "cash-outline" : "card-outline"} 
                        size={18} 
                        color={item.PayMode === "CASH" ? "#10b981" : "#3b82f6"} 
                       />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                       <Text style={styles.activityTitle}>Order # {item.BillID || item.SettlementID?.slice(0, 6)}</Text>
                       <Text style={styles.activityTime}>{new Date(item.SettlementDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.PayMode}</Text>
                    </View>
                    <Text style={styles.activityValue}>{formatCurrency(item.SysAmount)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* TRANSACTION DETAIL POPUP */}
        <Modal
          visible={!!selectedOrder}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedOrder(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity activeOpacity={1} style={styles.modalDismiss} onPress={() => setSelectedOrder(null)} />
            <View style={styles.modalContent}>
               <View style={styles.modalHeader}>
                 <View>
                    <Text style={styles.modTitle}># {selectedOrder?.BillID || selectedOrder?.SettlementID?.slice(0, 8)}</Text>
                    <Text style={styles.modSub}>{new Date(selectedOrder?.SettlementDate).toLocaleString()}</Text>
                 </View>
                 <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.modClose}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                 </TouchableOpacity>
               </View>

               <View style={styles.modBody}>
                  <Text style={styles.modLabel}>Order Items</Text>
                  {loadingDetails ? (
                    <ActivityIndicator color="#4f46e5" style={{ marginVertical: 30 }} />
                  ) : (
                    <View style={styles.modItemsList}>
                       {orderDetails.map((item, idx) => (
                         <View key={idx} style={styles.modItemRow}>
                           <View style={styles.modQtyBox}><Text style={styles.modQty}>{item.Qty}x</Text></View>
                           <Text style={styles.modName}>{item.DishName}</Text>
                           <Text style={styles.modPrice}>${(item.Price * item.Qty).toFixed(2)}</Text>
                         </View>
                       ))}
                    </View>
                  )}

                  <View style={styles.modSummary}>
                     <View style={styles.modTotalRow}>
                        <Text style={styles.modTotalLabel}>Total Amount</Text>
                        <Text style={styles.modTotalValue}>${selectedOrder?.SysAmount?.toFixed(2)}</Text>
                     </View>
                     <View style={styles.modDetailRow}>
                        <Text style={styles.modDetailLabel}>Payment Method</Text>
                        <Text style={styles.modDetailValue}>{selectedOrder?.PayMode}</Text>
                     </View>
                  </View>
               </View>
               
               <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.modDoneBtn}>
                  <Text style={styles.modDoneText}>Done</Text>
               </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* SIDEBAR FILTER PANEL */}
        <Modal
          visible={showFilterPanel}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilterPanel(false)}
        >
          <View style={styles.filterOverlay}>
             <TouchableOpacity activeOpacity={1} style={styles.filterDismiss} onPress={() => setShowFilterPanel(false)} />
             <View style={styles.filterSheet}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Filters</Text>
                  <TouchableOpacity onPress={() => setShowFilterPanel(false)}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.sheetSection}>
                    <Text style={styles.sheetLabel}>PAYMENT MODES</Text>
                    <View style={styles.chipGrid}>
                       {["CASH", "CARD", "NETS", "PAYNOW"].map(m => (
                         <TouchableOpacity key={m} onPress={() => togglePaymentMode(m)} style={[styles.chip, activePaymentModes.includes(m) && styles.chipActive]}>
                           <Text style={[styles.chipText, activePaymentModes.includes(m) && styles.chipTextActive]}>{m}</Text>
                         </TouchableOpacity>
                       ))}
                    </View>
                  </View>

                  <View style={styles.sheetSection}>
                    <Text style={styles.sheetLabel}>SORT ORDER</Text>
                    <View style={styles.chipGrid}>
                       {["NEWEST", "HIGHEST"].map((s: any) => (
                         <TouchableOpacity key={s} onPress={() => setSortOrder(s)} style={[styles.chip, sortOrder === s && styles.chipActive]}>
                           <Text style={[styles.chipText, sortOrder === s && styles.chipTextActive]}>{s}</Text>
                         </TouchableOpacity>
                       ))}
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.sheetFooter}>
                   <TouchableOpacity style={styles.sheetApplyBtn} onPress={() => setShowFilterPanel(false)}>
                      <Text style={styles.sheetApplyText}>Apply Filters</Text>
                   </TouchableOpacity>
                </View>
             </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#f8fafc" },
  
  /* HEADER */
  dashboardHeader: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    zIndex: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  titleArea: { gap: 2 },
  mainTitle: { fontSize: 18, fontFamily: Fonts.black, color: "#1e293b" },
  mainSubtitle: { fontSize: 10, fontFamily: Fonts.bold, color: "#94a3b8", textTransform: "uppercase" },
  
  /* PROFILE */
  profileBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 10,
    marginLeft: 5,
    borderLeftWidth: 1,
    borderLeftColor: "#f1f5f9",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#4f46e515",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#4f46e530",
  },
  avatarText: { color: "#4f46e5", fontFamily: Fonts.black, fontSize: 12 },
  profileText: { gap: 1 },
  profileName: { fontSize: 13, fontFamily: Fonts.extraBold, color: "#1e293b" },
  profileRole: { fontSize: 9, fontFamily: Fonts.bold, color: "#94a3b8", textTransform: "uppercase" },

  /* SIDEBAR */
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#1e293b",
    zIndex: 100,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  sidebarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30, paddingHorizontal: 10 },
  sidebarBrand: { fontSize: 24, fontFamily: Fonts.black, color: "#fff" },
  sidebarCloseBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center" },
  sidebarSectionLabel: { fontSize: 10, fontFamily: Fonts.black, color: "#475569", letterSpacing: 1.5, marginBottom: 15, paddingHorizontal: 10 },
  sidebarNav: { flex: 1 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 5,
    gap: 12,
  },
  navItemActive: { backgroundColor: "#4f46e5" },
  navText: { fontSize: 14, fontFamily: Fonts.bold, color: "#94a3b8" },
  navTextActive: { color: "#fff" },
  sidebarFooter: { marginTop: 20 },
  upgradeBtn: {
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  upgradeText: { color: "#fff", fontFamily: Fonts.black, fontSize: 13 },

  /* MAIN CONTENT */
  mainContent: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  pillActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  pillText: { fontSize: 11, fontFamily: Fonts.bold, color: "#64748b" },
  pillTextActive: { color: "#fff" },
  spacer: { flex: 1 },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#4f46e510",
  },
  filterBtnText: { color: "#4f46e5", fontFamily: Fonts.black, fontSize: 12 },

  /* DATE CONTROL */
  dateControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 20,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  navDateBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#4f46e510", justifyContent: "center", alignItems: "center" },
  dateDisplayBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  dateDisplayText: { fontSize: 15, fontFamily: Fonts.black, color: "#1e293b" },

  /* METRICS */
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: SCREEN_W >= 768 ? 180 : "45%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: 10, fontFamily: Fonts.bold, color: "#94a3b8", marginBottom: 2 },
  cardValue: { fontSize: 16, fontFamily: Fonts.black, color: "#1e293b" },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  trendText: { fontSize: 9, fontFamily: Fonts.bold, color: "#10b981" },

  /* CHARTS & LISTS */
  contentRow: { gap: 20, marginBottom: 40 },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontFamily: Fonts.black, color: "#1e293b", marginBottom: 20 },
  
  circularChartPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  ringOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 15,
    borderColor: "#4f46e520",
    justifyContent: "center",
    alignItems: "center",
  },
  ringInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  centerValue: { fontSize: 18, fontFamily: Fonts.black, color: "#1e293b" },
  centerLabel: { fontSize: 10, fontFamily: Fonts.bold, color: "#94a3b8" },

  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  legendEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 80,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, fontFamily: Fonts.bold, color: "#94a3b8" },
  legendVal: { fontSize: 13, fontFamily: Fonts.black, color: "#1e293b" },

  /* ACTIVITY ROW */
  cardHeaderArea: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  viewAllText: { fontSize: 12, fontFamily: Fonts.bold, color: "#4f46e5" },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  activityTitle: { fontSize: 14, fontFamily: Fonts.extraBold, color: "#1e293b" },
  activityTime: { fontSize: 11, fontFamily: Fonts.bold, color: "#94a3b8" },
  activityValue: { fontSize: 15, fontFamily: Fonts.black, color: "#1e293b" },

  /* MODALS */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalDismiss: { ...StyleSheet.absoluteFillObject },
  modalContent: { width: "100%", maxWidth: 500, backgroundColor: "#fff", borderRadius: 32, padding: 24, overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modTitle: { fontSize: 20, fontFamily: Fonts.black, color: "#1e293b" },
  modSub: { fontSize: 12, fontFamily: Fonts.bold, color: "#94a3b8" },
  modClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  modBody: { marginVertical: 20 },
  modLabel: { fontSize: 12, fontFamily: Fonts.black, color: "#4f46e5", letterSpacing: 1, marginBottom: 15 },
  modItemsList: { gap: 12 },
  modItemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modQtyBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#4f46e510", justifyContent: "center", alignItems: "center" },
  modQty: { fontSize: 11, fontFamily: Fonts.black, color: "#4f46e5" },
  modName: { flex: 1, fontSize: 14, fontFamily: Fonts.bold, color: "#1e293b" },
  modPrice: { fontSize: 14, fontFamily: Fonts.black, color: "#1e293b" },
  modSummary: { marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#f1f5f9", gap: 10 },
  modTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  modTotalLabel: { fontSize: 16, fontFamily: Fonts.black, color: "#1e293b" },
  modTotalValue: { fontSize: 20, fontFamily: Fonts.black, color: "#4f46e5" },
  modDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modDetailLabel: { fontSize: 12, fontFamily: Fonts.bold, color: "#94a3b8" },
  modDetailValue: { fontSize: 12, fontFamily: Fonts.black, color: "#1e293b" },
  modDoneBtn: { backgroundColor: "#4f46e5", height: 55, borderRadius: 20, justifyContent: "center", alignItems: "center", marginTop: 20 },
  modDoneText: { fontSize: 16, fontFamily: Fonts.black, color: "#fff" },

  /* FILTER SHEET */
  filterOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  filterDismiss: { ...StyleSheet.absoluteFillObject },
  filterSheet: { backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30 },
  sheetTitle: { fontSize: 22, fontFamily: Fonts.black, color: "#1e293b" },
  sheetSection: { marginBottom: 30 },
  sheetLabel: { fontSize: 11, fontFamily: Fonts.black, color: "#94a3b8", letterSpacing: 1, marginBottom: 15 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#f1f5f9" },
  chipActive: { backgroundColor: "#4f46e510", borderColor: "#4f46e5" },
  chipText: { fontSize: 13, fontFamily: Fonts.bold, color: "#64748b" },
  chipTextActive: { color: "#4f46e5" },
  sheetFooter: { marginTop: 20 },
  sheetApplyBtn: { backgroundColor: "#4f46e5", height: 60, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  sheetApplyText: { fontSize: 16, fontFamily: Fonts.black, color: "#fff" },
});