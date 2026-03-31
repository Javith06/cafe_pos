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

