import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CartSidebar from "../../components/CartSidebar";
import { Fonts } from "../../constants/Fonts";
import {
  addToCartGlobal,
  getContextId,
  setCurrentContext,
  useCartStore,
} from "../../stores/cartStore";
import { useOrderContextStore } from "../../stores/orderContextStore";
import { API_URL } from "../../constants/Config";

const API = API_URL;

const kitchenIcons: Record<string, string> = {
  "THAI KITCHEN": "🍜",
  "INDIAN KITCHEN": "🍛",
  "SOUTH INDIAN": "🍲",
  "WESTERN KITCHEN": "🍔",
  DRINKS: "🥤",
  FISH: "🐟",
};

// Per-kitchen gradient colors for placeholder backgrounds
const kitchenGradients: Record<string, string[]> = {
  "THAI KITCHEN": ["#134e4a", "#065f46"],
  "INDIAN KITCHEN": ["#78350f", "#92400e"],
  "SOUTH INDIAN": ["#7c2d12", "#9a3412"],
  "WESTERN KITCHEN": ["#1e3a5f", "#1e40af"],
  DRINKS: ["#312e81", "#4c1d95"],
  FISH: ["#164e63", "#155e75"],
};
const defaultGradient = ["#1e293b", "#0f172a"];

type Kitchen = {
  CategoryId: string;
  KitchenTypeName: string;
};
type Group = {
  DishGroupId: string;
  DishGroupName: string;
};

type Dish = {
  DishId: string;
  DishIntId: number;
  Name: string;
  Price?: number;
  ImageBase64?: string;
  imageid?: number;
};

type Modifier = {
  ModifierID: string;
  ModifierName: string;
  Price?: number;
};

// Image Component with Error Handling
const DishImage = ({
  dish,
  style,
  kitchenName,
}: {
  dish: Dish;
  style: any;
  kitchenName?: string;
}) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [dish.DishId]);

  const getImageUrl = () => {
    if (error) return null;
    if (dish.ImageBase64) {
      return { uri: dish.ImageBase64 };
    }
    return null;
  };

  const imageUrl = getImageUrl();

  // Placeholder: kitchen color bg + subtle icon
  if (!imageUrl || error) {
    const gradColors = kitchenGradients[kitchenName || ""] || defaultGradient;
    return (
      <View
        style={[
          style,
          {
            backgroundColor: gradColors[0],
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Ionicons
          name="restaurant-outline"
          size={32}
          color="rgba(255,255,255,0.25)"
        />
      </View>
    );
  }

  return (
    <Image source={imageUrl} style={style} onError={() => setError(true)} />
  );
};

// --- PREMIUM SKELETON LOADER ---
const DishSkeleton = ({ width }: { width: number }) => {
  return (
    <View style={[styles.card, { width, opacity: 0.6 }]}>
      <View style={[styles.imagePlaceholder, { backgroundColor: "#1e293b" }]} />
      <View style={styles.cardContent}>
        <View
          style={{
            height: 16,
            backgroundColor: "#334155",
            borderRadius: 4,
            width: "80%",
            marginBottom: 8,
          }}
        />
        <View
          style={{
            height: 16,
            backgroundColor: "#334155",
            borderRadius: 4,
            width: "60%",
            marginBottom: 8,
          }}
        />
        <View
          style={{
            height: 20,
            backgroundColor: "#064e3b",
            borderRadius: 4,
            width: "40%",
            marginTop: 4,
          }}
        />
      </View>
    </View>
  );
};

const STABLE_EMPTY_ARRAY: any[] = [];

export default function MenuScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Dish[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [selectedKitchenId, setSelectedKitchenId] = useState("");
  const [selectedKitchenName, setSelectedKitchenName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [showModifier, setShowModifier] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [customText, setCustomText] = useState("");
  const [customModifiers, setCustomModifiers] = useState<Modifier[]>([]);

  const listRef = useRef<FlatList<Dish>>(null);
  const orderContext = useOrderContextStore((state) => state.currentOrder);

  // Responsive columns
  let columns = 2;
  if (width > 1200) {
    columns = 4;
  } else if (width > 800) {
    columns = 3;
  }

  let availableWidth = width;
  if (width > 900) {
    availableWidth = width - 350;
  }

  const gap = 12;
  const horizontalPadding = 56;
  const cardWidth =
    (availableWidth - horizontalPadding - gap * (columns - 1)) / columns;

  // Set context ID for cart when orderContext changes avoiding infinite loop
  useEffect(() => {
    const newId = getContextId(orderContext);
    const existingId = useCartStore.getState().currentContextId;

    if (existingId !== newId) {
      setCurrentContext(newId);
      console.log("Cart context set to:", newId);
    }
  }, [orderContext]);

  // Use stable selector for cart instead of setInterval
  const cart = useCartStore((s) => {
    const id = s.currentContextId;
    return id ? s.carts[id] || STABLE_EMPTY_ARRAY : STABLE_EMPTY_ARRAY;
  });

  // Load kitchens
  useEffect(() => {
    fetch(`${API}/kitchens`)
      .then((res) => res.json())
      .then((data) => {
        const safe = Array.isArray(data) ? data : [];

        // FILTER OUT TEST1 KITCHEN
        const filteredKitchens = safe.filter(
          (k) =>
            k.KitchenTypeName !== "TEST1" &&
            !k.KitchenTypeName.includes("TEST"),
        );

        setKitchens(filteredKitchens);
        setIsInitialLoading(false);

        if (filteredKitchens.length > 0 && orderContext) {
          loadGroups(
            filteredKitchens[0].CategoryId,
            filteredKitchens[0].KitchenTypeName,
          );
        }
      })
      .catch((err) => {
        console.log("KITCHEN ERROR:", err);
        setIsInitialLoading(false);
      });
  }, [orderContext]);

  const loadGroups = async (kitchenId: string, kitchenName: string) => {
    setSelectedKitchenId(kitchenId);
    setSelectedKitchenName(kitchenName);
    setSelectedGroup("");
    setGroups([]);
    setItems([]);

    console.log("Fetching dish groups for kitchen:", kitchenName);
    try {
      const res = await fetch(`${API}/dishgroups/${kitchenId}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      console.log("Groups received:", data);
      const safe = Array.isArray(data) ? data : [];
      setGroups(safe);
      if (safe.length > 0) {
        loadDishes(safe[0].DishGroupId);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.log("GROUP ERROR:", err);
    }
  };

  const loadDishes = async (groupId: string) => {
    setSelectedGroup(groupId);
    setItems([]);
    setIsLoadingDishes(true);

    console.log("Fetching dishes for group:", groupId);

    try {
      const res = await fetch(`${API}/dishes/${groupId}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const data = await res.json();
      console.log(`Dishes received:`, data);

      const safe = Array.isArray(data) ? data : [];

      const uniqueData = Array.from(
        new Map(safe.map((item) => [item.DishId, item])).values(),
      );

      setItems(uniqueData);
    } catch (err) {
      console.log("DISH ERROR:", err);
    } finally {
      setIsLoadingDishes(false);
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  };

  const totalItems = useMemo(
    () => cart.reduce((s, i) => s + (i.qty || 0), 0),
    [cart],
  );

  const openModifiers = async (dish: Dish) => {
    if (!orderContext) {
      alert("Please select a table/counter first");
      router.push("/(tabs)/category");
      return;
    }

    setSelectedDish(dish);
    setSelectedModifierIds([]);
    setCustomModifiers([]);
    setCustomText("");
    setCustomPrice("");

    try {
      const res = await fetch(`${API}/modifiers/${dish.DishId}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setModifiers(data);
        setShowModifier(true);
      } else {
        addToCartGlobal({
          id: dish.DishId,
          name: dish.Name,
          price: dish.Price ?? 0,
        });
      }
    } catch (err) {
      addToCartGlobal({
        id: dish.DishId,
        name: dish.Name,
        price: dish.Price ?? 0,
      });
    }
  };

  const toggleModifier = (modifier: Modifier) => {
    if (modifier.ModifierName === "OPEN") {
      setShowCustomModal(true);
      return;
    }

    setSelectedModifierIds((prev) =>
      prev.includes(modifier.ModifierID)
        ? prev.filter((id) => id !== modifier.ModifierID)
        : [...prev, modifier.ModifierID],
    );
  };

  const addCustomModifier = () => {
    if (!customText.trim()) {
      alert("Please enter item name");
      return;
    }

    const price = parseFloat(customPrice) || 0;

    // Check if same custom item already exists
    const exists = customModifiers.some(
      (mod) => mod.ModifierName === customText && mod.Price === price,
    );

    if (exists) {
      alert("This item already added");
      return;
    }

    const customModifierObj = {
      ModifierID: `CUSTOM_${Date.now()}_${Math.random()}`,
      ModifierName: customText,
      Price: price,
    };

    setSelectedModifierIds((prev) => [...prev, customModifierObj.ModifierID]);
    setCustomModifiers((prev) => [...prev, customModifierObj]);
    setCustomText("");
    setCustomPrice("");
    setShowCustomModal(false);
  };

  const addWithModifiers = () => {
    if (!selectedDish) return;

    const selectedRegularModifiers = modifiers
      .filter((m) => selectedModifierIds.includes(m.ModifierID))
      .map((m) => ({
        ModifierId: m.ModifierID,
        ModifierName: m.ModifierName,
        Price: m.Price ?? 0,
      }));

    const customModifiersToAdd = customModifiers.map((m) => ({
      ModifierId: m.ModifierID,
      ModifierName: m.ModifierName,
      Price: m.Price ?? 0,
    }));

    const extra =
      selectedRegularModifiers.reduce((sum, m) => sum + (m.Price || 0), 0) +
      customModifiersToAdd.reduce((sum, m) => sum + (m.Price || 0), 0);

    const finalPrice = (selectedDish.Price ?? 0) + extra;

    addToCartGlobal({
      id: selectedDish.DishId,
      name: selectedDish.Name,
      price: finalPrice,
      modifiers: [...selectedRegularModifiers, ...customModifiersToAdd],
    });

    setShowModifier(false);
    setSelectedModifierIds([]);
    setCustomModifiers([]);
    setCustomText("");
    setCustomPrice("");
  };

  const goToCart = () => {
    router.push("/cart");
  };

  // If no order context, show message
  if (!orderContext) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.noContextContainer}>
          <Text style={styles.noContextText}>No Active Order Context</Text>
          <Text style={styles.noContextSubText}>
            Please select a table from P.O.S Dashboard
          </Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => router.replace("/(tabs)/category")}
          >
            <Text style={styles.goBackText}>Go to P.O.S Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.noContextContainer}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={[styles.emptyText, { marginTop: 20, color: "#4ade80" }]}>
            Initializing Kitchen...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={require("../../assets/images/mesh_bg.png")}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View
          style={[
            styles.page,
            { flexDirection: width > 900 ? "row" : "column" },
          ]}
        >
          <BlurView intensity={65} tint="dark" style={styles.main}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {selectedKitchenName || "Select Kitchen"}
                </Text>
                {totalItems > 0 && (
                  <View style={{ marginTop: 2 }}>
                    <Text style={styles.subTitle} numberOfLines={1}>
                      {totalItems} item{totalItems === 1 ? "" : "s"} selected
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                {width <= 900 && (
                  <TouchableOpacity
                    onPress={goToCart}
                    style={[
                      styles.backBtn,
                      totalItems > 0
                        ? { backgroundColor: "#22c55e", borderWidth: 0 }
                        : {
                            backgroundColor: "rgba(255,255,255,0.15)",
                            borderWidth: 0,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.backText,
                        totalItems > 0
                          ? { color: "#052b12", fontWeight: "900" }
                          : { color: "#cbd5e1", fontWeight: "700" },
                      ]}
                    >
                      🛒 Cart
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => router.replace("/(tabs)/category")}
                  style={styles.backBtn}
                >
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Order Context Display */}
            <View style={styles.contextContainer}>
              <Text style={styles.contextText}>
                {orderContext.orderType === "DINE_IN"
                  ? `DINE-IN | ${orderContext.section} | Table ${orderContext.tableNo}`
                  : `TAKEAWAY | Order ${orderContext.takeawayNo}`}
              </Text>
            </View>

            {/* Kitchens */}
            <View style={styles.sectionContainer}>
              {/* Accent section label */}
              <View style={styles.accentLabelRow}>
                <View style={styles.accentBar} />
                <Text style={styles.sectionLabel}>KITCHENS</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.kitchenRow}
              >
                {kitchens.map((k) => {
                  const active = k.CategoryId === selectedKitchenId;
                  const gradColors =
                    kitchenGradients[k.KitchenTypeName] || defaultGradient;
                  return (
                    <TouchableOpacity
                      key={k.CategoryId}
                      style={[
                        styles.kitchenCard,
                        active && styles.kitchenActive,
                        active && {
                          shadowColor: "#22c55e",
                          shadowOpacity: 0.5,
                          shadowRadius: 10,
                          shadowOffset: { width: 0, height: 0 },
                          elevation: 8,
                        },
                      ]}
                      onPress={() =>
                        loadGroups(k.CategoryId, k.KitchenTypeName)
                      }
                    >
                      {/* Gradient background strip */}
                      <View
                        style={[
                          styles.kitchenGradientBg,
                          { backgroundColor: gradColors[0] },
                          active && { opacity: 0.9 },
                        ]}
                      />
                      <Text style={styles.kitchenIcon}>
                        {kitchenIcons[k.KitchenTypeName] || "🍽️"}
                      </Text>
                      <Text
                        style={[
                          styles.kitchenText,
                          active && styles.kitchenTextActive,
                        ]}
                        numberOfLines={2}
                      >
                        {k.KitchenTypeName}
                      </Text>
                      {active && <View style={styles.kitchenActiveDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Groups */}
            {groups.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.accentLabelRow}>
                  <View style={styles.accentBar} />
                  <Text style={styles.sectionLabel}>CATEGORIES</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupRow}
                >
                  {groups.map((g) => {
                    const active = g.DishGroupId === selectedGroup;
                    return (
                      <TouchableOpacity
                        key={g.DishGroupId}
                        style={[styles.chip, active && styles.activeChip]}
                        onPress={() => loadDishes(g.DishGroupId)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.activeChipText,
                          ]}
                          numberOfLines={1}
                        >
                          {g.DishGroupName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Dishes Grid */}
            <View style={[styles.sectionContainer, { flex: 1 }]}>
              <View style={styles.accentLabelRow}>
                <View style={styles.accentBar} />
                <Text style={styles.sectionLabel}>DISHES</Text>
                {items.length > 0 && !isLoadingDishes && (
                  <Text style={styles.dishCount}>{items.length} items</Text>
                )}
              </View>
              <FlatList
                ref={listRef}
                data={
                  (isLoadingDishes ? [1, 2, 3, 4, 5, 6, 7, 8] : items) as any[]
                }
                numColumns={columns}
                key={`grid-${columns}`}
                keyExtractor={(item, index) =>
                  isLoadingDishes
                    ? `skeleton-${index}`
                    : item.DishId + "_" + index
                }
                columnWrapperStyle={
                  columns > 1
                    ? {
                        justifyContent: "flex-start",
                        gap: gap,
                        marginBottom: gap,
                      }
                    : undefined
                }
                contentContainerStyle={styles.gridContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  !isLoadingDishes ? (
                    <View style={styles.emptyWrap}>
                      <Text style={styles.emptyText}>No items available</Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }) =>
                  isLoadingDishes ? (
                    <DishSkeleton width={cardWidth} />
                  ) : (
                    <TouchableOpacity
                      style={[styles.card, { width: cardWidth }]}
                      onPress={() => openModifiers(item)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.imageWrap}>
                        <DishImage
                          dish={item}
                          style={styles.image}
                          kitchenName={selectedKitchenName}
                        />
                        <View style={styles.priceBadge}>
                          <Text style={styles.priceBadgeText}>
                            ${item.Price?.toFixed(2) ?? "0.00"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardContent}>
                        <Text style={styles.name} numberOfLines={2}>
                          {item.Name}
                        </Text>
                        <TouchableOpacity
                          style={styles.addToCartBtn}
                          activeOpacity={0.75}
                          onPress={(e) => {
                            e.stopPropagation();
                            openModifiers(item);
                          }}
                        >
                          <Ionicons name="add-circle" size={14} color="#052b12" />
                          <Text style={styles.addToCartText}>Add to Cart</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  )
                }
              />
            </View>
          </BlurView>

          {/* Cart Sidebar for wide screens */}
          {width > 900 && <CartSidebar width={373} />}

          {/* Modifier Modal */}
          <Modal
            visible={showModifier}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setShowModifier(false);
              setCustomModifiers([]);
              setSelectedModifierIds([]);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Select modifiers for {selectedDish?.Name}
                </Text>

                <ScrollView
                  style={{ maxHeight: 350 }}
                  showsVerticalScrollIndicator={false}
                >
                  {modifiers.map((mod) => (
                    <TouchableOpacity
                      key={mod.ModifierID}
                      style={styles.modifierRow}
                      onPress={() => toggleModifier(mod)}
                    >
                      <Text style={styles.modifierName}>
                        {mod.ModifierName}
                        {mod.Price && mod.Price > 0 && (
                          <Text style={styles.modifierPrice}>
                            {" "}
                            (+${mod.Price.toFixed(2)})
                          </Text>
                        )}
                      </Text>

                      <View style={styles.checkbox}>
                        {selectedModifierIds.includes(mod.ModifierID) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}

                  {customModifiers.length > 0 && (
                    <View style={styles.customSection}>
                      <Text style={styles.customSectionTitle}>
                        Custom Items:
                      </Text>
                      {customModifiers.map((custom, idx) => (
                        <View key={idx} style={styles.customItemRow}>
                          <Text style={styles.customItemText}>
                            {custom.ModifierName}{" "}
                            {custom.Price &&
                              custom.Price > 0 &&
                              `(+$${custom.Price.toFixed(2)})`}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setCustomModifiers((prev) =>
                                prev.filter((_, i) => i !== idx),
                              );
                              setSelectedModifierIds((prev) =>
                                prev.filter((id) => id !== custom.ModifierID),
                              );
                            }}
                          >
                            <Text style={styles.removeText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={() => {
                      setShowModifier(false);
                      setCustomModifiers([]);
                      setSelectedModifierIds([]);
                    }}
                  >
                    <Text style={styles.btnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, styles.addBtn]}
                    onPress={addWithModifiers}
                  >
                    <Text style={styles.btnText}>🛒 Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Custom Item Modal */}
          <Modal
            visible={showCustomModal}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setShowCustomModal(false);
              setCustomText("");
              setCustomPrice("");
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.customModalContent}>
                <Text style={styles.modalTitle}>Add Custom Item</Text>

                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter item name"
                  placeholderTextColor="#999"
                  value={customText}
                  onChangeText={setCustomText}
                />

                <Text style={styles.inputLabel}>Price (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter price"
                  placeholderTextColor="#999"
                  value={customPrice}
                  onChangeText={setCustomPrice}
                  keyboardType="numeric"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={() => {
                      setShowCustomModal(false);
                      setCustomText("");
                      setCustomPrice("");
                    }}
                  >
                    <Text style={styles.btnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, styles.addBtn]}
                    onPress={addCustomModifier}
                  >
                    <Text style={styles.btnText}>Add Item</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000",
  },
  page: {
    flex: 1,
  },
  main: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  noContextContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  noContextText: {
    color: "#ff4444",
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginBottom: 10,
  },
  noContextSubText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    fontFamily: Fonts.regular,
  },
  goBackButton: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  goBackText: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  contextContainer: {
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  contextText: {
    color: "#22c55e",
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  /* Accent label row */
  accentLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  accentBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#22c55e",
  },
  dishCount: {
    color: "#4ade80",
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    marginLeft: 4,
  },
  header: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  title: {
    color: "#22c55e",
    fontFamily: Fonts.extraBold,
    fontSize: 20,
  },
  subTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 2,
    fontFamily: Fonts.regular,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backText: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  kitchenRow: {
    gap: 12,
    paddingRight: 8,
    paddingBottom: 4,
  },
  kitchenCard: {
    width: 110,
    height: 84,
    borderRadius: 16,
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
    position: "relative",
  },
  kitchenGradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.45,
  },
  kitchenActive: {
    borderColor: "#4ade80",
    borderWidth: 1.5,
  },
  kitchenActiveDot: {
    position: "absolute",
    bottom: 6,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#22c55e",
  },
  kitchenIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  kitchenText: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: Fonts.bold,
    fontSize: 11,
    textAlign: "center",
  },
  kitchenTextActive: {
    color: "#fff",
    fontFamily: Fonts.extraBold,
  },
  groupRow: {
    gap: 10,
    paddingRight: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  activeChip: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: "#4ade80",
    borderWidth: 1.5,
  },
  chipText: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: Fonts.extraBold,
    fontSize: 13,
  },
  activeChipText: {
    color: "#22c55e",
  },
  gridContent: {
    paddingBottom: 20,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 16,
  },
  /* Dish card */
  card: {
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: 120,
  },
  image: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  imageGradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  priceBadge: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(34,197,94,0.85)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priceBadgeText: {
    color: "#052b12",
    fontFamily: Fonts.black,
    fontSize: 13,
  },
  imagePlaceholder: {
    backgroundColor: "rgba(30, 41, 59, 1)",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 120,
  },
  placeholderText: {
    fontSize: 40,
  },
  cardContent: {
    padding: 10,
    gap: 2,
  },
  name: {
    color: "#fff",
    fontFamily: Fonts.extraBold,
    fontSize: 14,
    minHeight: 38,
  },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#22c55e",
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 6,
  },
  addToCartText: {
    color: "#052b12",
    fontFamily: Fonts.black,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  price: {
    color: "#22c55e",
    fontFamily: Fonts.black,
    fontSize: 15,
  },
  mobileCartButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mobileCartText: {
    color: "#fff",
    fontFamily: Fonts.extraBold,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
    backgroundColor: "#1e1e1e",
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    color: "#22c55e",
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 20,
    textAlign: "center",
  },
  modifierRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modifierName: {
    color: "#fff",
    fontSize: 15,
    flex: 1,
  },
  modifierPrice: {
    color: "#22c55e",
    fontSize: 12,
    marginLeft: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "#22c55e",
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#333",
  },
  addBtn: {
    backgroundColor: "#22c55e",
  },
  btnText: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  customSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  customSectionTitle: {
    color: "#22c55e",
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    marginBottom: 10,
  },
  customItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    marginBottom: 8,
  },
  customItemText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  removeText: {
    color: "#ff4444",
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  customModalContent: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#1e1e1e",
    borderRadius: 24,
    padding: 24,
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    fontFamily: Fonts.regular,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
    marginTop: 8,
  },
});
