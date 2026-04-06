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

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MembersScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
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
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
      Alert.alert("Database Error", "Unable to connect to the member vault.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const openAddModal = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      creditLimit: "1000",
      currentBalance: "0",
      balance: "0",
    });
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
    
    // Strict Validation
    if (
      !name.trim() || 
      !phone.trim() || 
      !email.trim() || 
      !creditLimit.trim() || 
      !currentBalance.trim() || 
      !balance.trim()
    ) {
      Alert.alert("Incomplete Form", "Please fill it.");
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = modalMode === "EDIT";
      const targetId = editingMember?.MemberId;
      
      const url = isEdit ? `${API_URL}/api/members/${targetId}` : `${API_URL}/api/members/add`;
      
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          creditLimit: parseFloat(creditLimit) || 0,
          currentBalance: parseFloat(currentBalance) || 0,
          balance: parseFloat(balance) || 0,
          initialBalance: parseFloat(balance) || 0,
        }),
      });

      const resultData = await res.json().catch(() => ({}));

      if (res.ok) {
        setModalMode("NONE");
        setTimeout(() => {
          fetchMembers();
          Alert.alert("Success", `Member details saved successfully.`);
        }, 300);
      } else {
        Alert.alert("Save Failed", resultData.error || "Server could not update record.");
      }
    } catch (err) {
      Alert.alert("Network Error", "Could not reach the server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = (member: MemberType) => {
    Alert.alert(
      "Confirm Removal",
      `Permanently delete ${member.Name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/members/${member.MemberId}`, {
                method: "DELETE",
              });
              const resultData = await res.json().catch(() => ({}));
              
              if (res.ok) {
                fetchMembers();
                Alert.alert("Removed", "Member record deleted.");
              } else {
                Alert.alert("Delete Error", resultData.error || "Could not remove member.");
              }
            } catch (err) {
              Alert.alert("Error", "Check your internet connection.");
            }
          }
        },
      ]
    );
  };

  const filteredMembers = members.filter(m => 
    m.Name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.Phone.includes(searchQuery) ||
    m.MemberId.toLowerCase().includes(searchQuery.toLowerCase())
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
            <TouchableOpacity 
              onPress={() => openEditModal(item)} 
              style={[styles.actionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}
            >
               <Ionicons name="create-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleDeleteMember(item)} 
              style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
            >
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
              <Text style={styles.label}>CURRENT BALANCE</Text>
              <Text style={styles.val}>${(item.CurrentBalance || 0).toFixed(2)}</Text>
           </View>
           <View style={styles.dataBox}>
              <Text style={styles.label}>ACCOUNT BALANCE</Text>
              <Text style={[styles.val, { fontFamily: Fonts.black }]}>${(item.Balance || 0).toFixed(2)}</Text>
           </View>
           <View style={[styles.dataBox, { width: '100%', borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.label}>MEMBER ID: {item.MemberId}</Text>
              <Text style={styles.valSmall}>Registered: {formatDt(item.CreatedAt)}</Text>
           </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circularBack}>
             <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Member Database</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.glassAddBtn}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.glassBtnText}>Member</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchWrapper, isSearchFocused && styles.searchWrapperActive]}>
          <BlurView intensity={15} tint="light" style={styles.searchInner}>
             <Ionicons name="search-outline" size={20} color={isSearchFocused ? "#3b82f6" : "#64748b"} />
             <TextInput
               placeholder="Search name, phone or ID..."
               placeholderTextColor="#64748b"
               style={styles.searchField}
               value={searchQuery}
               onChangeText={setSearchQuery}
               onFocus={() => setIsSearchFocused(true)}
               onBlur={() => setIsSearchFocused(false)}
             />
             {searchQuery !== "" && (
               <TouchableOpacity onPress={() => setSearchQuery("")}>
                 <Ionicons name="close-circle" size={18} color="#64748b" />
               </TouchableOpacity>
             )}
          </BlurView>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingTxt}>Fetching records...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.MemberId}
            renderItem={renderMember}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="people-outline" size={80} color="rgba(255,255,255,0.03)" />
                <Text style={styles.emptyTxt}>No members found</Text>
              </View>
            }
          />
        )}

        {/* Modal */}
        <Modal visible={modalMode !== "NONE"} transparent animationType="fade">
          <BlurView intensity={40} tint="dark" style={styles.overlay}>
             <View style={styles.formSheet}>
                <View style={styles.sheetHeader}>
                   <View>
                      <Text style={styles.sheetTitle}>{modalMode === "EDIT" ? "Modify Record" : "New Account"}</Text>
                      <Text style={styles.sheetSubtitle}>{modalMode === "EDIT" ? "Update member profile" : "Create new member"}</Text>
                   </View>
                   <TouchableOpacity onPress={() => setModalMode("NONE")} style={styles.sheetClose}>
                      <Ionicons name="close" size={24} color="#fff" />
                   </TouchableOpacity>
                </View>

                <ScrollView style={styles.sheetBody}>
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>FULL NAME *</Text>
                      <TextInput 
                        style={styles.sheetInput}
                        value={formData.name}
                        onChangeText={(v) => setFormData({...formData, name: v})}
                      />
                   </View>

                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>PHONE NUMBER *</Text>
                      <TextInput 
                        style={styles.sheetInput}
                        keyboardType="phone-pad"
                        value={formData.phone}
                        onChangeText={(v) => setFormData({...formData, phone: v})}
                      />
                   </View>

                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
                      <TextInput 
                        style={styles.sheetInput}
                        keyboardType="email-address"
                        value={formData.email}
                        onChangeText={(v) => setFormData({...formData, email: v})}
                      />
                   </View>

                   <View style={styles.inputRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>CREDIT LIMIT *</Text>
                        <TextInput 
                          style={styles.sheetInput}
                          keyboardType="numeric"
                          value={formData.creditLimit}
                          onChangeText={(v) => setFormData({...formData, creditLimit: v})}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                         <Text style={styles.inputLabel}>BALANCE *</Text>
                         <TextInput 
                           style={styles.sheetInput}
                           keyboardType="numeric"
                           value={formData.balance}
                           onChangeText={(v) => setFormData({...formData, balance: v})}
                         />
                      </View>
                   </View>

                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>CURRENT BALANCE *</Text>
                      <TextInput 
                        style={styles.sheetInput}
                        keyboardType="numeric"
                        value={formData.currentBalance}
                        onChangeText={(v) => setFormData({...formData, currentBalance: v})}
                      />
                   </View>

                   <TouchableOpacity 
                      style={[styles.submitBtn, isSaving && { opacity: 0.7 }]} 
                      onPress={handleSaveMember}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
                          <Text style={styles.submitBtnText}>Save Changes</Text>
                        </>
                      )}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  circularBack: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  screenTitle: { flex: 1, color: "#fff", fontSize: 20, fontFamily: Fonts.black },
  glassAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#3b82f6", borderRadius: 12 },
  glassBtnText: { color: "#fff", fontFamily: Fonts.bold, fontSize: 13 },
  searchWrapper: { marginHorizontal: 16, marginBottom: 20, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  searchWrapperActive: { borderColor: "rgba(59, 130, 246, 0.4)" },
  searchInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 48, gap: 12 },
  searchField: { flex: 1, color: "#fff", fontFamily: Fonts.medium, fontSize: 15 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  loadingTxt: { color: "#64748b", fontSize: 14, fontFamily: Fonts.medium },
  emptyTxt: { color: "#475569", fontSize: 16, fontFamily: Fonts.bold },
  memberCard: { backgroundColor: "rgba(30, 41, 59, 0.4)", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(59,130,246,0.1)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(59,130,246,0.2)" },
  avatarLetter: { color: "#60a5fa", fontSize: 20, fontFamily: Fonts.black },
  memberName: { color: "#fff", fontSize: 18, fontFamily: Fonts.bold },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  memberPhone: { color: "#94a3b8", fontSize: 13, fontFamily: Fonts.medium },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 18 },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  dataBox: { width: '50%', paddingRight: 8 },
  label: { color: "#475569", fontSize: 9, fontFamily: Fonts.black, letterSpacing: 0.8, marginBottom: 4 },
  val: { color: "#f8fafc", fontSize: 14, fontFamily: Fonts.semiBold },
  valSmall: { color: "#64748b", fontSize: 12, fontFamily: Fonts.medium },
  overlay: { flex: 1, justifyContent: "flex-end" },
  formSheet: { backgroundColor: "#0f172a", borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '92%', borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  sheetTitle: { color: "#fff", fontSize: 24, fontFamily: Fonts.black },
  sheetSubtitle: { color: "#64748b", fontSize: 14, fontFamily: Fonts.medium },
  sheetClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: 'center', alignItems: 'center' },
  sheetBody: { padding: 24 },
  inputGroup: { marginBottom: 22 },
  inputRow: { flexDirection: 'row', gap: 16, marginBottom: 22 },
  inputLabel: { color: "#94a3b8", fontSize: 11, fontFamily: Fonts.black, marginBottom: 8, letterSpacing: 1.2 },
  sheetInput: { height: 54, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, color: "#fff", paddingHorizontal: 18, fontSize: 16, fontFamily: Fonts.medium, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  submitBtn: { backgroundColor: "#fff", height: 60, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 },
  submitBtnText: { color: "#000", fontFamily: Fonts.black, fontSize: 16 },
});
