import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CartSidebar from "../../components/CartSidebar";
import {
  addToCartGlobal,
  CartItem,
  getContextId,
  setCurrentContext,
  useCartStore,
} from "../../stores/cartStore";
import {
  OrderContext,
  useOrderContextStore,
} from "../../stores/orderContextStore";

const API = "https://cafepos-production-3428.up.railway.app";

const kitchenIcons: Record<string, string> = {
  "THAI KITCHEN": "🍜",
  "INDIAN KITCHEN": "🍛",
  "SOUTH INDIAN": "🍲",
  "WESTERN KITCHEN": "🍔",
  DRINKS: "🥤",
  FISH: "🐟",
};

type Kitchen = {
  KitchenTypeId: number;
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
  imagename?: string;
  imageid?: number;
};

type Modifier = {
  ModifierId: string;
  ModifierName: string;
  Price?: number;
};

// Image Component with Error Handling
const DishImage = ({ dish, style }: { dish: Dish; style: any }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [dish.DishId]);

  const getImageUrl = () => {
    if (error) return null;

    if (dish.imagename) {
      const fileName = dish.imagename
        .replace(/[()]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase();
      return { uri: `${API}/images/${fileName}` };
    }

    const fileName =
      dish.Name.replace(/[()]/g, "").replace(/\s+/g, "_").toLowerCase() +
      ".jpg";
    return { uri: `${API}/images/${fileName}` };
  };

  if (error) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <Text style={styles.placeholderText}>🍽️</Text>
      </View>
    );
  }

  const imageUrl = getImageUrl();
  if (!imageUrl) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <Text style={styles.placeholderText}>🍽️</Text>
      </View>
    );
  }

  return (
    <Image source={imageUrl} style={style} onError={() => setError(true)} />
  );
};

const STABLE_EMPTY_ARRAY: any[] = [];

export default function MenuScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Dish[]>([]);

  const [selectedKitchen, setSelectedKitchen] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [showModifier, setShowModifier] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);

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
  const cardWidth = (availableWidth - horizontalPadding - gap * (columns - 1)) / columns;

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

        if (filteredKitchens.length > 0 && orderContext) {
          loadGroups(filteredKitchens[0].KitchenTypeName);
        }
      })
      .catch((err) => console.log("KITCHEN ERROR:", err));
  }, []);

  const loadGroups = async (kitchen: string) => {
    setSelectedKitchen(kitchen);
    setSelectedGroup("");
    setGroups([]);
    setItems([]);

    console.log("Fetching dish groups for kitchen:", kitchen);
    try {
      const res = await fetch(`${API}/dishgroups/${kitchen}`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      console.log(`Groups received for ${kitchen}:`, data.length);
      const safe = Array.isArray(data) ? data : [];
      setGroups(safe);
      if (safe.length > 0) loadDishes(safe[0].DishGroupId);
    } catch (err) {
      console.log("GROUP ERROR:", err);
    }
  };

  const loadDishes = (groupId: string) => {
    setSelectedGroup(groupId);
    console.log("Fetching dishes for group:", groupId);

    fetch(`${API}/dishes/${groupId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log(`Dishes received for group ${groupId}:`, data.length);
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.log("DISH ERROR:", err));

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

  const toggleModifier = (modifierId: string) => {
    setSelectedModifierIds((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId],
    );
  };

  const addWithModifiers = () => {
    if (!selectedDish) return;

    const selectedModifiers = modifiers.filter((m) =>
      selectedModifierIds.includes(m.ModifierId),
    );

    addToCartGlobal({
      id: selectedDish.DishId,
      name: selectedDish.Name,
      price: selectedDish.Price ?? 0,
      modifiers: selectedModifiers,
    });

    setShowModifier(false);
    setSelectedModifierIds([]);
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

  return (
    <SafeAreaView style={styles.safe}>
      <View
        style={[styles.page, { flexDirection: width > 900 ? "row" : "column" }]}
      >
        <BlurView intensity={40} tint="dark" style={styles.main}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {selectedKitchen || "Select Kitchen"}
              </Text>
              {totalItems > 0 && (
                <TouchableOpacity onPress={goToCart}>
                  <Text style={styles.subTitle} numberOfLines={1}>
                    🛒 {totalItems} item{totalItems === 1 ? "" : "s"} in cart
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/category")}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
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
            <Text style={styles.sectionLabel}>KITCHENS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.kitchenRow}
            >
              {kitchens.map((k) => {
                const active = k.KitchenTypeName === selectedKitchen;
                return (
                  <TouchableOpacity
                    key={k.KitchenTypeId}
                    style={[styles.kitchenCard, active && styles.kitchenActive]}
                    onPress={() => loadGroups(k.KitchenTypeName)}
                  >
                    <Text style={styles.kitchenIcon}>
                      {kitchenIcons[k.KitchenTypeName] || "🍽️"}
                    </Text>
                    <Text style={styles.kitchenText} numberOfLines={2}>
                      {k.KitchenTypeName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Groups */}
          {groups.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>CATEGORIES</Text>
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
                      <Text style={styles.chipText} numberOfLines={1}>
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
            <Text style={styles.sectionLabel}>DISHES</Text>
            <FlatList
              ref={listRef}
              data={items}
              numColumns={columns}
              key={`grid-${columns}`}
              keyExtractor={(i) => i.DishId}
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
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No items available</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.card, { width: cardWidth }]}
                  onPress={() => openModifiers(item)}
                  activeOpacity={0.9}
                >
                  <DishImage dish={item} style={styles.image} />
                  <View style={styles.cardContent}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.Name}
                    </Text>
                    <Text style={styles.price} numberOfLines={1}>
                      $ {item.Price?.toFixed(2) ?? "0.00"}
                    </Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        openModifiers(item);
                      }}
                    >
                      <Text style={styles.addButtonText}>ADD</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </BlurView>

        {/* Cart Sidebar for wide screens */}
        {width > 900 && <CartSidebar width={350} />}

        {/* Mobile Cart Button */}
        {width <= 900 && totalItems > 0 && (
          <TouchableOpacity style={styles.mobileCartButton} onPress={goToCart}>
            <Text style={styles.mobileCartText}>
              🛒 View Cart ({totalItems})
            </Text>
          </TouchableOpacity>
        )}

        {/* Modifier Modal */}
        <Modal
          visible={showModifier}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModifier(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Select modifiers for {selectedDish?.Name}
              </Text>

              {modifiers.map((mod) => (
                <TouchableOpacity
                  key={mod.ModifierId}
                  style={styles.modifierRow}
                  onPress={() => toggleModifier(mod.ModifierId)}
                >
                  <Text style={styles.modifierName}>{mod.ModifierName}</Text>
                  <View style={styles.checkbox}>
                    {selectedModifierIds.includes(mod.ModifierId) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setShowModifier(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.addBtn]}
                  onPress={addWithModifiers}
                >
                  <Text style={styles.btnText}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
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
    fontWeight: "bold",
    marginBottom: 10,
  },
  noContextSubText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  goBackButton: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  goBackText: {
    color: "#fff",
    fontWeight: "bold",
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
    fontWeight: "600",
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
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
    fontWeight: "800",
    fontSize: 20,
  },
  subTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 2,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  kitchenRow: {
    gap: 12,
    paddingRight: 8,
    paddingBottom: 4,
  },
  kitchenCard: {
    width: 110,
    height: 80,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  kitchenActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  kitchenIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  kitchenText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
    textAlign: "center",
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
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  activeChip: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  chipText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 120,
  },
  placeholderText: {
    fontSize: 40,
  },
  cardContent: {
    padding: 12,
    gap: 4,
  },
  name: {
    color: "#111",
    fontWeight: "700",
    fontSize: 14,
  },
  price: {
    color: "#22c55e",
    fontWeight: "900",
    fontSize: 15,
  },
  addButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
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
    fontWeight: "800",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "#1e1e1e",
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modifierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modifierName: {
    color: "#fff",
    fontSize: 16,
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
    fontWeight: "bold",
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
    fontWeight: "bold",
    fontSize: 15,
  },
});
