import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../constants/Config";
import { Fonts } from "../constants/Fonts";
import { useMemberStore, Member } from "../stores/memberStore";

const MembersScreen = () => {
  const router = useRouter();
  const { members, loading, fetchMembers, addMember } = useMemberStore();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = members.filter(
    (m) =>
      m.Name.toLowerCase().includes(search.toLowerCase()) ||
      m.Phone.includes(search)
  );

  const handleAddMember = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert("Error", "Please enter both name and phone number.");
      return;
    }

    setAdding(true);
    const success = await addMember(newName, newPhone);
    setAdding(false);

    if (success) {
      setShowAddModal(false);
      setNewName("");
      setNewPhone("");
      Alert.alert("Success", "Member added successfully.");
    } else {
      Alert.alert("Error", "Failed to add member.");
    }
  };

  const renderItem = ({ item }: { item: Member }) => (
    <TouchableOpacity style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <Text style={styles.avatarText}>{item.Name.charAt(0)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.Name}</Text>
        <Text style={styles.memberPhone}>{item.Phone}</Text>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text style={[styles.balanceValue, item.Balance > 0 && styles.debtText]}>
          ${item.Balance.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Members</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#60a5fa" />
          </View>
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.MemberId.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            }
          />
        )}

        {/* Add Member Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <BlurView intensity={20} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Member</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter name"
                  placeholderTextColor="#64748b"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter phone"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  value={newPhone}
                  onChangeText={setNewPhone}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleAddMember}
                  disabled={adding}
                >
                  {adding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Member</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default MembersScreen;

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
    flex: 1,
    color: "#fff",
    fontSize: 24,
    fontFamily: Fonts.black,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#60a5fa",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  addBtnText: {
    color: "#fff",
    fontFamily: Fonts.bold,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: "#fff",
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.4)",
  },
  avatarText: {
    color: "#60a5fa",
    fontSize: 20,
    fontFamily: Fonts.black,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 15,
  },
  memberName: {
    color: "#fff",
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  memberPhone: {
    color: "#94a3b8",
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  balanceContainer: {
    alignItems: "flex-end",
  },
  balanceLabel: {
    color: "#64748b",
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    textTransform: "uppercase",
  },
  balanceValue: {
    color: "#4ade80",
    fontSize: 18,
    fontFamily: Fonts.black,
  },
  debtText: {
    color: "#fb923c",
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
    marginTop: 80,
    gap: 20,
  },
  emptyText: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 18,
    fontFamily: Fonts.medium,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: Fonts.black,
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: Fonts.bold,
    marginBottom: 8,
    marginLeft: 4,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: "#fff",
    fontFamily: Fonts.medium,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cancelBtnText: {
    color: "#94a3b8",
    fontFamily: Fonts.bold,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#60a5fa",
  },
  saveBtnText: {
    color: "#fff",
    fontFamily: Fonts.bold,
  },
});
