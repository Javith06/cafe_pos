import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "../constants/Config";
import { Fonts } from "../constants/Fonts";
import { BlurView } from "expo-blur";

type MemberType = {
  MemberId: string;
  Name: string;
  Phone: string;
  Email: string;
  CreditLimit: number;
  CurrentBalance: number;
};

export default function MembersScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New member state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLimit, setNewLimit] = useState("1000");

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/members`);
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const addMember = async () => {
    if (!newName || !newPhone) {
      Alert.alert("Error", "Please enter name and phone number");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/members/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          creditLimit: parseFloat(newLimit) || 1000,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewName("");
        setNewPhone("");
        fetchMembers();
        Alert.alert("Success", "Member added successfully");
      } else {
        const error = await res.json();
        Alert.alert("Error", error.message || "Failed to add member");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Server error adding member");
    }
  };

  const filteredMembers = members.filter(m => 
    m.Name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.Phone.includes(searchQuery)
  );

  const renderMember = ({ item }: { item: MemberType }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <Text style={styles.avatarText}>{item.Name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.Name}</Text>
        <Text style={styles.memberPhone}>{item.Phone}</Text>
      </View>
      <View style={styles.memberBalance}>
        <Text style={styles.balanceLabel}>Outstanding</Text>
        <Text style={[styles.balanceValue, item.CurrentBalance > 0 && styles.unpaidBalance]}>
          ${item.CurrentBalance.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Members Dashboard</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="person-add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by name or phone..."
            placeholderTextColor="#64748b"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4ade80" />
          </View>
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.MemberId}
            renderItem={renderMember}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={64} color="rgba(255,255,255,0.05)" />
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            }
          />
        )}

        {/* Add Member Modal */}
        <Modal visible={showAddModal} transparent animationType="fade">
          <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
             <View style={styles.modalCard}>
               <Text style={styles.modalTitle}>Register Regular Customer</Text>
               <Text style={styles.inputLabel}>FULL NAME</Text>
               <TextInput 
                  style={styles.input} 
                  placeholder="e.g. John Doe" 
                  placeholderTextColor="#475569" 
                  value={newName} 
                  onChangeText={setNewName}
                />
               <Text style={styles.inputLabel}>PHONE NUMBER</Text>
               <TextInput 
                  style={styles.input} 
                  placeholder="e.g. 9876543210" 
                  placeholderTextColor="#475569" 
                  keyboardType="phone-pad"
                  value={newPhone}
                  onChangeText={setNewPhone}
                />
               <Text style={styles.inputLabel}>CREDIT LIMIT ($)</Text>
               <TextInput 
                  style={styles.input} 
                  placeholder="1000" 
                  placeholderTextColor="#475569" 
                  keyboardType="numeric"
                  value={newLimit}
                  onChangeText={setNewLimit}
                />
               
               <View style={styles.modalActions}>
                 <TouchableOpacity 
                   style={styles.cancelBtn} 
                   onPress={() => setShowAddModal(false)}
                 >
                   <Text style={{color: '#94a3b8', fontFamily: Fonts.bold}}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={styles.saveBtn} 
                   onPress={addMember}
                 >
                   <Text style={{color: '#fff', fontFamily: Fonts.bold}}>Register Member</Text>
                 </TouchableOpacity>
               </View>
             </View>
          </BlurView>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A08" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: { fontSize: 18, color: "#fff", fontFamily: Fonts.black },
  iconBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20 },
  addBtn: { padding: 8, backgroundColor: "#3b82f6", borderRadius: 20 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: "#fff", fontFamily: Fonts.medium, fontSize: 15 },
  listContent: { padding: 16, gap: 12 },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10,18,14,0.6)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.05)",
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59,130,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: { color: "#60a5fa", fontSize: 20, fontFamily: Fonts.black },
  memberInfo: { flex: 1 },
  memberName: { color: "#fff", fontSize: 16, fontFamily: Fonts.bold },
  memberPhone: { color: "#64748b", fontSize: 13, fontFamily: Fonts.medium, marginTop: 2 },
  memberBalance: { alignItems: "flex-end" },
  balanceLabel: { color: "#64748b", fontSize: 10, fontFamily: Fonts.bold, textTransform: "uppercase" },
  balanceValue: { color: "#fff", fontSize: 16, fontFamily: Fonts.black, marginTop: 4 },
  unpaidBalance: { color: "#ef4444" },
  emptyBox: { flex: 1, marginTop: 100, alignItems: "center" },
  emptyText: { color: "rgba(255,255,255,0.2)", fontSize: 16, fontFamily: Fonts.medium, marginTop: 16 },
  
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { width: "90%", backgroundColor: "#0f172a", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle: { color: "#fff", fontSize: 20, fontFamily: Fonts.black, marginBottom: 24 },
  inputLabel: { color: "#64748b", fontSize: 11, fontFamily: Fonts.black, marginBottom: 8, letterSpacing: 1 },
  input: { 
    height: 50, 
    backgroundColor: "rgba(0,0,0,0.3)", 
    borderRadius: 12, 
    color: "#fff", 
    paddingHorizontal: 16, 
    fontFamily: Fonts.medium,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)"
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 10 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  saveBtn: { backgroundColor: "#3b82f6", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
});
