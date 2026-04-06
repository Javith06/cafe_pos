import React, { useEffect, useState, useCallback } from "react";
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
  ScrollView,
  Dimensions,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "@/constants/Config";
import { Fonts } from "../constants/Fonts";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

type MemberType = {
  MemberId: string;
  Name: string;
  Phone: string;
  Email?: string;
  CreditLimit?: number;
  CurrentBalance?: number;
  Balance?: number;
  CreatedAt?: string;
};

export default function MembersScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [modalMode, setModalMode] = useState<"ADD" | "EDIT" | "NONE">("NONE");
  const [editingMember, setEditingMember] = useState<MemberType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    creditLimit: "1000",
    currentBalance: "0",
    balance: "0",
  });

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/members?t=${Date.now()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[FETCH] Connection problem");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const openAddModal = () => {
    setFormData({ name: "", phone: "", email: "", creditLimit: "1000", currentBalance: "0", balance: "0" });
    setEditingMember(null);
    setModalMode("ADD");
  };

  const openEditModal = (member: MemberType) => {
    setEditingMember(member);
    setFormData({
      name: member.Name,
      phone: member.Phone,
      email: member.Email || "",
      creditLimit: String(member.CreditLimit ?? 1000),
      currentBalance: String(member.CurrentBalance ?? 0),
      balance: String(member.Balance ?? 0),
    });
    setModalMode("EDIT");
  };

  const handleSaveMember = async () => {
    const { name, phone, email, creditLimit, currentBalance, balance } = formData;
    if (!name.trim() || !phone.trim() || !email.trim()) {
      Alert.alert("Required", "Please fill Name, Phone and Email.");
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = modalMode === "EDIT";
      const url = isEdit ? `${API_URL}/api/members/update` : `${API_URL}/api/members/add`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: editingMember?.MemberId,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          creditLimit: parseFloat(creditLimit) || 0,
          currentBalance: parseFloat(currentBalance) || 0,
          balance: parseFloat(balance) || 0,
        }),
      });

      if (res.ok) {
        setModalMode("NONE");
        setTimeout(() => {
          fetchMembers();
          Alert.alert("Success", "Account registered.");
        }, 800);
      } else {
        const d = await res.json().catch(() => ({}));
        Alert.alert("Error", d.error || "Save failed.");
      }
    } catch (err) {
      Alert.alert("Slow Network", "Connection dropped. Please wait 5 seconds and retry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = (member: MemberType) => {
    Alert.alert(
      "Confirm",
      `Permanently delete ${member.Name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              // OPTIMISTIC UPDATE: Hide immediately for smooth UX
              const targetId = member.MemberId;
              setMembers(prev => prev.filter(m => m.MemberId !== targetId));

              const res = await fetch(`${API_URL}/api/members/delete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: targetId }),
              });
              
              if (res.ok) {
                Alert.alert("Deleted", "Member removed from registry.");
                // Sync list in background
                setTimeout(() => fetchMembers(), 1000);
              } else {
                fetchMembers(); // Restore if failed
                const resultData = await res.json().catch(() => ({}));
                Alert.alert("Failed", resultData.error || "Could not delete.");
              }
            } catch (err) {
              fetchMembers(); // Restore if failed
              Alert.alert("Link Failure", "Network is too slow. Please check server.");
            }
          }
        },
      ]
    );
  };

  const filteredMembers = members.filter(m => 
    m.Name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.Phone.includes(searchQuery)
  );

  const renderMember = ({ item }: { item: MemberType }) => {
    return (
      <View style={styles.memberCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
             <Text style={styles.avatarLetter}>{item.Name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{item.Name}</Text>
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={12} color="#64748b" />
              <Text style={styles.memberPhone}>{item.Phone}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={[styles.actionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
               <Ionicons name="create-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteMember(item)} style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
               <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.dataGrid}>
           <View style={styles.dataBox}>
              <Text style={styles.label}>EMAIL</Text>
              <Text style={styles.val} numberOfLines={1}>{item.Email || "—"}</Text>
           </View>
           <View style={styles.dataBox}>
              <Text style={styles.label}>CREDIT LIMIT</Text>
              <Text style={[styles.val, { color: '#4ade80' }]}>${(item.CreditLimit || 0).toFixed(2)}</Text>
           </View>
           <View style={styles.dataBox}>
              <Text style={styles.label}>CURRENT BAL</Text>
              <Text style={styles.val}>${(item.CurrentBalance || 0).toFixed(2)}</Text>
           </View>
           <View style={styles.dataBox}>
              <Text style={styles.label}>FINAL BALANCE</Text>
              <Text style={[styles.val, { fontFamily: Fonts.black }]}>${(item.Balance || 0).toFixed(2)}</Text>
           </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circularBack}>
             <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Member Management</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.glassAddBtn}>
            <Text style={styles.glassBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <BlurView intensity={10} tint="light" style={styles.searchInner}>
             <Ionicons name="search" size={18} color="#64748b" />
             <TextInput
               placeholder="Search registry..."
               placeholderTextColor="#64748b"
               style={styles.searchField}
               value={searchQuery}
               onChangeText={setSearchQuery}
             />
          </BlurView>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.MemberId}
            renderItem={renderMember}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMembers} tintColor="#3b82f6" />}
          />
        )}

        <Modal visible={modalMode !== "NONE"} transparent animationType="slide">
          <BlurView intensity={60} tint="dark" style={styles.overlay}>
             <View style={styles.formSheet}>
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>{modalMode === "EDIT" ? "Edit Data" : "Register"}</Text>
                    <TouchableOpacity onPress={() => setModalMode("NONE")} style={styles.sheetClose}>
                       <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.sheetBody}>
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>NAME</Text>
                      <TextInput style={styles.sheetInput} value={formData.name} onChangeText={v => setFormData({...formData, name: v})}/>
                   </View>
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>PHONE</Text>
                      <TextInput style={styles.sheetInput} keyboardType="phone-pad" value={formData.phone} onChangeText={v => setFormData({...formData, phone: v})}/>
                   </View>
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>EMAIL</Text>
                      <TextInput style={styles.sheetInput} keyboardType="email-address" value={formData.email} onChangeText={v => setFormData({...formData, email: v})}/>
                   </View>
                   <View style={styles.inputRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>CREDIT LIMIT</Text>
                        <TextInput style={styles.sheetInput} keyboardType="numeric" value={formData.creditLimit} onChangeText={v => setFormData({...formData, creditLimit: v})}/>
                      </View>
                      <View style={{ flex: 1 }}>
                         <Text style={styles.inputLabel}>FINAL BALANCE</Text>
                         <TextInput style={styles.sheetInput} keyboardType="numeric" value={formData.balance} onChangeText={v => setFormData({...formData, balance: v})}/>
                      </View>
                   </View>
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>CURRENT BALANCE</Text>
                      <TextInput style={styles.sheetInput} keyboardType="numeric" value={formData.currentBalance} onChangeText={v => setFormData({...formData, currentBalance: v})}/>
                   </View>

                   <TouchableOpacity style={styles.submitBtn} onPress={handleSaveMember} disabled={isSaving}>
                      {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Update Record</Text>}
                   </TouchableOpacity>
                   <View style={{ height: 40 }} />
                </ScrollView>
             </View>
          </BlurView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  circularBack: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center" },
  screenTitle: { flex: 1, color: "#fff", fontSize: 18, fontFamily: Fonts.black },
  glassAddBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#3b82f6", borderRadius: 10 },
  glassBtnText: { color: "#fff", fontFamily: Fonts.bold, fontSize: 13 },
  searchWrapper: { marginHorizontal: 16, marginBottom: 16 },
  searchInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 44, borderRadius: 12, overflow: 'hidden' },
  searchField: { flex: 1, color: "#fff", fontFamily: Fonts.medium, fontSize: 14, marginLeft: 10 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  memberCard: { backgroundColor: "rgba(30, 41, 59, 0.4)", borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: "#3b82f6" },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(59,130,246,0.1)", justifyContent: "center", alignItems: "center" },
  avatarLetter: { color: "#60a5fa", fontSize: 16, fontFamily: Fonts.black },
  memberName: { color: "#fff", fontSize: 16, fontFamily: Fonts.bold },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  memberPhone: { color: "#94a3b8", fontSize: 11 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 12 },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  dataBox: { width: '50%' },
  label: { color: "#64748b", fontSize: 8, fontFamily: Fonts.black, marginBottom: 2 },
  val: { color: "#f8fafc", fontSize: 12, fontFamily: Fonts.semiBold },
  overlay: { flex: 1, justifyContent: "flex-end" },
  formSheet: { backgroundColor: "#0f172a", borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  sheetTitle: { color: "#fff", fontSize: 20, fontFamily: Fonts.black },
  sheetClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: 'center', alignItems: 'center' },
  sheetBody: { padding: 20, paddingTop: 0 },
  inputGroup: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputLabel: { color: "#94a3b8", fontSize: 9, fontFamily: Fonts.black, marginBottom: 6 },
  sheetInput: { height: 46, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, color: "#fff", paddingHorizontal: 12, fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  submitBtn: { backgroundColor: "#fff", height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitBtnText: { color: "#000", fontFamily: Fonts.black, fontSize: 14 },
});
