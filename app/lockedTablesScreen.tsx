import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../constants/Config";
import { Fonts } from "../constants/Fonts";

type TableType = {
  tableId: string;
  tableNumber: string;
  Status: number;
};

const LockedTablesScreen = () => {
  const router = useRouter();
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLockedTables = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tables/locked`);
      const data = await res.json();
      setTables(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockedTables();
  }, []);

  const unlockTable = async (tableId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/tables/unreserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      if (res.ok) {
        fetchLockedTables();
      }
    } catch (err) {
      console.log(err);
    }
  };

  const renderItem = ({ item }: { item: TableType }) => (
    <View style={styles.tableCard}>
      <View style={styles.tableIcon}>
        <Ionicons name="lock-closed" size={32} color="#facc15" />
      </View>
      <View style={styles.tableInfo}>
        <Text style={styles.tableLabel}>Table {item.tableNumber}</Text>
        <Text style={styles.statusText}>Reserved / Locked</Text>
      </View>
      <TouchableOpacity
        style={styles.unlockBtn}
        onPress={() => {
          Alert.alert("Unlock Table", `Are you sure you want to unlock Table ${item.tableNumber}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Unlock", onPress: () => unlockTable(item.tableId), style: "destructive" },
          ]);
        }}
      >
        <Ionicons name="lock-open-outline" size={20} color="#fff" />
        <Text style={styles.unlockText}>Unlock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require("../assets/images/mesh_bg.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Locked Tables</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#facc15" />
          </View>
        ) : (
          <FlatList
            data={tables}
            keyExtractor={(item) => item.tableId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="lock-open-outline" size={64} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>No tables are currently locked</Text>
              </View>
            }
          />
        )}
      </ImageBackground>
    </SafeAreaView>
  );
};

export default LockedTablesScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000" },
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 15,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: Fonts.black,
  },
  listContent: {
    padding: 20,
    gap: 15,
  },
  tableCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tableIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: "rgba(250, 204, 21, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  tableInfo: {
    flex: 1,
    marginLeft: 15,
  },
  tableLabel: {
    color: "#fff",
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  statusText: {
    color: "#94a3b8",
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  unlockText: {
    color: "#fff",
    fontFamily: Fonts.bold,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
    gap: 20,
  },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 18,
    fontFamily: Fonts.medium,
  },
});
