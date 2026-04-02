import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { API_URL } from "@/constants/Config";
import { Fonts } from "../constants/Fonts";

type TableType = {
  tableId: string;
  tableNumber: string;
};

const MAX_TABLE = 15; // Adjusted for better visibility on one screen

export default function LockedTablesScreen() {
  const router = useRouter();
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const fetchTables = async () => {
    try {
      if (tables.length === 0) setLoading(true);
      const res = await fetch(`${API_URL}/api/tables/locked`);
      const data = await res.json();
      setTables(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to fetch locked tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const unlockTable = async (tableId: string, tableNumber: string) => {
    Alert.alert(
      "Unlock Table",
      `Are you sure you want to unlock Table ${tableNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/tables/unlock-persistent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tableId }),
              });
              if (res.ok) {
                fetchTables(); // refresh
              }
            } catch (err) {
              console.log(err);
              Alert.alert("Error", "Failed to unlock table");
            }
          },
        },
      ]
    );
  };

  const startIndex = page * MAX_TABLE;
  const endIndex = Math.min(startIndex + MAX_TABLE, tables.length);
  const currentTables = tables.slice(startIndex, endIndex);

  const renderItem = ({ item }: { item: TableType }) => (
    <TouchableOpacity
      style={styles.tableBtn}
      onPress={() => unlockTable(item.tableId, item.tableNumber)}
      activeOpacity={0.7}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed" size={20} color="#fff" />
      </View>
      <Text style={styles.tableNumText}>{item.tableNumber}</Text>
      <Text style={styles.statusText}>LOCKED</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Locked Tables</Text>
          <TouchableOpacity onPress={fetchTables} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={22} color="#4ade80" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4ade80" />
          </View>
        ) : (
          <View style={{ flex: 1, padding: 16 }}>
            <FlatList
              data={currentTables}
              keyExtractor={(item) => item.tableId}
              renderItem={renderItem}
              numColumns={3}
              columnWrapperStyle={styles.row}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="lock-open-outline" size={64} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.emptyText}>No tables are currently locked</Text>
                </View>
              }
            />

            {tables.length > MAX_TABLE && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.navBtn, page === 0 && styles.disabledBtn]}
                  onPress={() => page > 0 && setPage(page - 1)}
                  disabled={page === 0}
                >
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                  <Text style={styles.navText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  {startIndex + 1}-{endIndex} of {tables.length}
                </Text>

                <TouchableOpacity
                  style={[styles.navBtn, endIndex >= tables.length && styles.disabledBtn]}
                  onPress={() => endIndex < tables.length && setPage(page + 1)}
                  disabled={endIndex >= tables.length}
                >
                  <Text style={styles.navText}>Next</Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060A08",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: {
    fontSize: 20,
    color: "#fff",
    fontFamily: Fonts.black,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    justifyContent: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  tableBtn: {
    flex: 1,
    maxWidth: "31%",
    aspectRatio: 1,
    backgroundColor: "rgba(157, 204, 69, 0.15)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(157, 204, 69, 0.4)",
    padding: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#8bc34a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  tableNumText: {
    fontSize: 22,
    color: "#fff",
    fontFamily: Fonts.black,
  },
  statusText: {
    fontSize: 10,
    color: "#8bc34a",
    fontFamily: Fonts.bold,
    marginTop: 4,
    letterSpacing: 1,
  },
  emptyBox: {
    flex: 1,
    marginTop: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 16,
    fontFamily: Fonts.medium,
    marginTop: 20,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 10,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6f4a7e",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  disabledBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    opacity: 0.5,
  },
  navText: {
    color: "#fff",
    fontFamily: Fonts.bold,
  },
  pageInfo: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
});
