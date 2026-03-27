import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "https://cafepos-production-3428.up.railway.app";

export default function SalesReport() {
  const [sales, setSales] = useState<any[]>([]);  // ✅ Explicit array type
  const [summary, setSummary] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

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
      // ✅ Ensure data is array
      if (Array.isArray(data)) {
        setSales(data);
      } else {
        console.log("Sales data is not array:", data);
        setSales([]);
      }
    } catch (error) {
      console.error("Sales fetch error:", error);
      setSales([]);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sales/daily/${selectedDate}`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("Summary fetch error:", error);
      setSummary(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount?.toFixed(2) || "0.00"}`;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
        <Text style={styles.loadingText}>Loading sales data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sales Report</Text>
        </View>

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.dateCard}>
            <Text style={styles.dateLabel}>Selected Date</Text>
            <Text style={styles.dateValue}>{selectedDate}</Text>
          </View>
          <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        {summary && summary.TotalSales > 0 ? (
          <>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Sales</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.TotalSales)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Transactions</Text>
                <Text style={styles.summaryValue}>{summary.TotalTransactions || 0}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Items Sold</Text>
                <Text style={styles.summaryValue}>{summary.TotalItems || 0}</Text>
              </View>
            </View>

            {/* Payment Mode Breakdown */}
            <View style={styles.paymentCard}>
              <Text style={styles.sectionTitle}>Payment Mode Breakdown</Text>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Cash</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(summary.CashSales)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>NETS</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(summary.NETS_Sales)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>PayNow</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(summary.PayNow_Sales)}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noDataCard}>
            <Text style={styles.noDataText}>No sales data for {selectedDate}</Text>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.transactionsCard}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {!Array.isArray(sales) || sales.length === 0 ? (
            <Text style={styles.noDataText}>No transactions found</Text>
          ) : (
            sales.slice(0, 10).map((item: any, index) => (
              <View key={index} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionDate}>
                    {item.SettlementDate ? new Date(item.SettlementDate).toLocaleDateString() : 'N/A'}
                  </Text>
                  <Text style={styles.transactionMode}>{item.PayMode}</Text>
                  <Text style={styles.transactionReceipts}>{item.ReceiptCount} items</Text>
                </View>
                <Text style={styles.transactionAmount}>
                  {formatCurrency(item.SysAmount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  header: {
    backgroundColor: "#2ecc71",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginTop: 15,
  },
  dateButton: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    width: 50,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2ecc71",
  },
  dateCard: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 10,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2ecc71",
  },
  paymentCard: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  paymentLabel: {
    fontSize: 14,
    color: "#666",
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  transactionsCard: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  transactionMode: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  transactionReceipts: {
    fontSize: 10,
    color: "#ccc",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2ecc71",
  },
  noDataCard: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
  },
  noDataText: {
    textAlign: "center",
    color: "#999",
    padding: 20,
  },
});