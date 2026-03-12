import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import CartSidebar from "../../components/CartSidebar";
import { addToCartGlobal, getCart } from "../cartStore";
import { getOrderContext } from "../orderContextStore";

import {
    FlatList,
    Image,
    ImageBackground,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ================= KITCHENS ================= */
const KITCHENS = [
  { id: "k1", name: "THAI KITCHEN", route: "/menu/thai_kitchen", icon: "🍜" },
  {
    id: "k2",
    name: "INDIAN KITCHEN",
    route: "/menu/indian_kitchen",
    icon: "🍛",
  },
  { id: "k3", name: "SOUTH INDIAN", route: "/menu/south_indian", icon: "🥞" },
  {
    id: "k4",
    name: "WESTERN KITCHEN",
    route: "/menu/western_kitchen",
    icon: "🍔",
  },
  { id: "k5", name: "DRINKS", route: "/menu/drinks", icon: "🥤" },
];

const ACTIVE_KITCHEN = "WESTERN KITCHEN";

/* ================= GROUPS ================= */
const GROUPS = [
  { id: "g1", name: "Appetizer" },
  { id: "g2", name: "Pasta" },
  { id: "g3", name: "Burgers" },
  { id: "g4", name: "Pizza" },
  { id: "g5", name: "Baked Rice" },
  { id: "g6", name: "Salad" },
  { id: "g7", name: "Chicken" },
  { id: "g8", name: "Lamb" },
];

/* ================= ITEMS ================= */
const ITEMS_BY_GROUP: Record<
  string,
  { id: string; name: string; price: number }[]
> = {
  Appetizer: [
    { id: "app_1", name: "Soup Garlic Bread", price: 12.5 },
    { id: "app_2", name: "Fries", price: 12.5 },
    { id: "app_3", name: "Cheese Fries", price: 12.5 },
    { id: "app_4", name: "Wedges", price: 12.5 },
    { id: "app_5", name: "Cheese Wedges", price: 12.5 },
    { id: "app_6", name: "Mash CrabMeat", price: 12.5 },
    { id: "app_7", name: "Mash Potato", price: 12.5 },
    { id: "app_8", name: "Nuggets", price: 12.5 },
    { id: "app_9", name: "2 Wings N Fries", price: 12.5 },
    { id: "app_10", name: "3pcs Buffalo Wings n Fries", price: 12.5 },
    { id: "app_11", name: "Popcorn Chicken", price: 12.5 },
    { id: "app_12", name: "Coleslaw", price: 12.5 },
    { id: "app_13", name: "Calamari Rings", price: 12.5 },
    { id: "app_14", name: "Scallops", price: 12.5 },
    { id: "app_15", name: "Mix Tempura", price: 12.5 },
    { id: "app_16", name: "Prawn Fritters", price: 12.5 },
    { id: "app_17", name: "Spring Chicken", price: 12.5 },
    { id: "app_18", name: "Roasted Chicken", price: 12.5 },
    { id: "app_19", name: "Udang Merah & Bread", price: 12.5 },
    { id: "app_20", name: "Pisang Goreng 2pcs", price: 3.0 },
    { id: "app_21", name: "Curry Puff 2pcs", price: 2.0 },
    { id: "app_22", name: "Kueh Ramadan", price: 12.5 },
    { id: "app_23", name: "Kueh Ramadan 3 pcs", price: 5.0 },
  ],

  Pasta: [
    { id: "pasta_1", name: "Veg Pomodoro", price: 12.5 },
    { id: "pasta_2", name: "Creamy Mushroom", price: 12.5 },
    { id: "pasta_3", name: "Mush Aglio Olio", price: 12.5 },
    { id: "pasta_4", name: "Teriyaki Pasta", price: 12.5 },
    { id: "pasta_5", name: "SF Olio", price: 12.5 },
    { id: "pasta_6", name: "Beef Bolognese", price: 12.5 },
    { id: "pasta_7", name: "Spicy Corn Beef", price: 12.5 },
    { id: "pasta_8", name: "SeaFood Marinara", price: 12.5 },
    { id: "pasta_9", name: "Sausage Carbonara", price: 12.5 },
    { id: "pasta_10", name: "Beefball Redang", price: 12.5 },
  ],

  Burgers: [
    { id: "burger_1", name: "Lamb Rock", price: 12.5 },
    { id: "burger_2", name: "Chicken Burger", price: 12.5 },
    { id: "burger_3", name: "Home Made Beef", price: 12.5 },
    { id: "burger_4", name: "Mushroom Cheese", price: 12.5 },
    { id: "burger_5", name: "Bold Crunchy Fish", price: 12.5 },
    { id: "burger_6", name: "Chicken Sandwich", price: 12.5 },
    { id: "burger_7", name: "CornBeef Sandwich", price: 12.5 },
    { id: "burger_8", name: "Tuna Sandwich", price: 12.5 },
    { id: "burger_9", name: "Veg Sandwich Cheese", price: 12.5 },
  ],

  Pizza: [
    { id: "pizza_1", name: "Haiwan Chicken", price: 12.5 },
    { id: "pizza_2", name: "Pepperoni Beef", price: 12.5 },
    { id: "pizza_3", name: "BBQ Chicken", price: 12.5 },
    { id: "pizza_4", name: "Veggie Lovers", price: 12.5 },
  ],

  "Baked Rice": [
    { id: "baked_1", name: "Baked Mushroom Chicken", price: 12.5 },
    { id: "baked_2", name: "Arborio Beef", price: 12.5 },
    { id: "baked_3", name: "Risotto Veggie", price: 12.5 },
  ],

  Salad: [
    { id: "salad_1", name: "Healthy Fruit Salad", price: 12.5 },
    { id: "salad_2", name: "Chicken Salad", price: 12.5 },
    { id: "salad_3", name: "Prawn Salad", price: 12.5 },
  ],

  Chicken: [
    { id: "chicken_1", name: "Grill Pepper Chicken", price: 12.5 },
    { id: "chicken_2", name: "Breaded Chicken", price: 12.5 },
    { id: "chicken_3", name: "Chicken & Mushroom", price: 12.5 },
  ],

  Lamb: [
    { id: "lamb_1", name: "Pepper Lamb", price: 12.5 },
    { id: "lamb_2", name: "Mushroom Lamb", price: 12.5 },
    { id: "lamb_3", name: "BBQ Lamb Cheese", price: 12.5 },
  ],

  Ribeye: [
    { id: "ribeye_1", name: "Ribeye B. Pepper", price: 12.5 },
    { id: "ribeye_2", name: "Ribeye Mushroom", price: 12.5 },
    { id: "ribeye_3", name: "Ribeye Cheese", price: 12.5 },
  ],

  Fish: [
    { id: "fish_1", name: "Fish N Chips", price: 12.5 },
    { id: "fish_2", name: "Green Fish Curry", price: 12.5 },
    { id: "fish_3", name: "Grilled Salmon", price: 12.5 },
  ],

  Dessert: [
    { id: "dessert_1", name: "Dark Lava Cake", price: 12.5 },
    { id: "dessert_2", name: "MixBerry Cheese Cake", price: 12.5 },
    { id: "dessert_3", name: "P Pannacotta", price: 12.5 },
    { id: "dessert_4", name: "Sticky Dates", price: 12.5 },
    { id: "dessert_23", name: "OPEN WESTERN", price: 12.5 },

    { id: "dessert_5", name: "Nasi Padang @ $5.00", price: 5.0 },
    { id: "dessert_6", name: "Nasi Padang @ $5.50", price: 5.5 },
    { id: "dessert_7", name: "Nasi Padang @ $6.00", price: 6.0 },
    { id: "dessert_8", name: "Nasi Padang @ $6.50", price: 6.5 },
    { id: "dessert_9", name: "Nasi Padang @ $7.00", price: 7.0 },
    { id: "dessert_10", name: "Nasi Padang @ $7.50", price: 7.5 },
    { id: "dessert_11", name: "Nasi Padang @ $8.00", price: 8.0 },
    { id: "dessert_12", name: "Nasi Padang @ $8.50", price: 8.5 },
    { id: "dessert_13", name: "Nasi Padang @ $9.00", price: 9.0 },
    { id: "dessert_14", name: "Nasi Padang @ $9.50", price: 9.5 },
    { id: "dessert_15", name: "Nasi Padang @ $10.00", price: 10.0 },
    { id: "dessert_16", name: "Nasi Padang @ $10.50", price: 10.5 },
    { id: "dessert_17", name: "Nasi Padang @ $11.00", price: 11.0 },
    { id: "dessert_18", name: "Nasi Padang @ $11.50", price: 11.5 },
    { id: "dessert_19", name: "Nasi Padang @ $12.00", price: 12.0 },
    { id: "dessert_20", name: "Nasi Padang @ $12.50", price: 12.5 },
    { id: "dessert_21", name: "Nasi Padang @ $15.00", price: 15.0 },
    { id: "dessert_22", name: "Nasi Minyak", price: 12.5 },
  ],
};

const FOOD_IMAGES: Record<string, any> = {
  /* ================= APPETIZER ================= */
  app_1: require("../../assets/images/western/Appetizer/Soup garlic bread.jpg"),
  app_2: require("../../assets/images/western/Appetizer/Fries.jpg"),
  app_3: require("../../assets/images/western/Appetizer/cheese_fries.jpg"),
  app_4: require("../../assets/images/western/Appetizer/Wedges.jpg"),
  app_5: require("../../assets/images/western/Appetizer/cheese_wedges.jpg"),
  app_6: require("../../assets/images/western/Appetizer/mash_crab_meat.jpg"),
  app_7: require("../../assets/images/western/Appetizer/mash_potato.jpg"),
  app_8: require("../../assets/images/western/Appetizer/Nuggets.jpg"),
  app_9: require("../../assets/images/western/Appetizer/2wings_fries.jpg"),
  app_10: require("../../assets/images/western/Appetizer/3pcs_buffalo wings_n_fries.jpg"),
  app_11: require("../../assets/images/western/Appetizer/Popcorn Chicken.jpg"),
  app_12: require("../../assets/images/western/Appetizer/Coleslaw.jpg"),
  app_13: require("../../assets/images/western/Appetizer/calamari_rings.jpg"),
  app_14: require("../../assets/images/western/Appetizer/Scallops.jpg"),
  app_15: require("../../assets/images/western/Appetizer/mix_tempura.jpg"),
  app_16: require("../../assets/images/western/Appetizer/Prawn Pritters.jpg"),
  app_17: require("../../assets/images/western/Appetizer/Spring Chicken.jpg"),
  app_18: require("../../assets/images/western/Appetizer/Roasted Chicken.jpg"),
  app_19: require("../../assets/images/western/Appetizer/Tulang merah and bread.jpg"),
  app_20: require("../../assets/images/western/Appetizer/Pisang goreng 2pcs @ $3.jpg"),
  app_21: require("../../assets/images/western/Appetizer/currypuff_2pcs @$2.jpg"),
  app_22: require("../../assets/images/western/Appetizer/kueh_ramadan.jpg"),
  app_23: require("../../assets/images/western/Appetizer/Kueh Ramadan 3@ $5.jpg"),

  /* ================= PASTA ================= */
  pasta_1: require("../../assets/images/western/Pasta/Veg PomoDoro Pasta.jpg"),
  pasta_2: require("../../assets/images/western/Pasta/Creamy Mushroom.jpg"),
  pasta_3: require("../../assets/images/western/Pasta/Mush agila olio.jpg"),
  pasta_4: require("../../assets/images/western/Pasta/Teriyaki Pasta.jpg"),
  pasta_5: require("../../assets/images/western/Pasta/SF Olio.jpg"),
  pasta_6: require("../../assets/images/western/Pasta/Beef Bolgnese.jpg"),
  pasta_7: require("../../assets/images/western/Pasta/Spicy corn beef.jpg"),
  pasta_8: require("../../assets/images/western/Pasta/Seafood Marinara.jpg"),
  pasta_9: require("../../assets/images/western/Pasta/SAUSAGE CABANORA.jpg"),
  pasta_10: require("../../assets/images/western/Pasta/Beef ball Redang.jpg"),

  /* ================= BURGER ================= */
  burger_1: require("../../assets/images/western/Burger/Lamb Rock.jpg"),
  burger_2: require("../../assets/images/western/Burger/Chicken Burger.jpg"),
  burger_3: require("../../assets/images/western/Burger/Homemade Beef.jpg"),
  burger_4: require("../../assets/images/western/Burger/Mushroom Cheese.jpg"),
  burger_5: require("../../assets/images/western/Burger/Bold Crunchy Fish.jpg"),
  burger_6: require("../../assets/images/western/Burger/Chicken sandwich.jpg"),
  burger_7: require("../../assets/images/western/Burger/Cornbeef Sandwich.jpg"),
  burger_8: require("../../assets/images/western/Burger/Tuna Sandwich.jpg"),
  burger_9: require("../../assets/images/western/Burger/Cheese Sandwich.jpg"),

  /* ================= PIZZA ================= */
  pizza_1: require("../../assets/images/western/Pizza/Haiwan chicken pizza.jpg"),
  pizza_2: require("../../assets/images/western/Pizza/Pepparoni Beef Pizza.jpg"),
  pizza_3: require("../../assets/images/western/Pizza/BBQ chicken pizza.jpg"),
  pizza_4: require("../../assets/images/western/Pizza/Veggie Lovers.jpg"),

  /* ================= BAKED RICE ================= */
  baked_1: require("../../assets/images/western/Baked Rice/Baked Mushroom Chicken.jpg"),
  baked_2: require("../../assets/images/western/Baked Rice/arborio beef.jpg"),
  baked_3: require("../../assets/images/western/Baked Rice/Rissoto Veggie.jpg"),

  /* ================= SALAD ================= */
  salad_1: require("../../assets/images/western/Salad/Healthy Fruit Salad.jpg"),
  salad_2: require("../../assets/images/western/Salad/Chicken salad.jpg"),
  salad_3: require("../../assets/images/western/Salad/Prawn salad.jpg"),

  /* ================= CHICKEN ================= */
  chicken_1: require("../../assets/images/western/Chicken/Grill pepper chicken.jpg"),
  chicken_2: require("../../assets/images/western/Chicken/Breaded Chicken.jpg"),
  chicken_3: require("../../assets/images/western/Chicken/Chicken & Mushroom.jpg"),

  /* ================= LAMB ================= */
  lamb_1: require("../../assets/images/western/Lamb/Pepper Lamb.jpg"),
  lamb_2: require("../../assets/images/western/Lamb/Mushrom Lamb.jpg"),
  lamb_3: require("../../assets/images/western/Lamb/BBQ Lamb Cheese.jpg"),

  /* ================= RIBEYE ================= */
  ribeye_1: require("../../assets/images/western/Ribeye/Ribeye B. Pepper.jpg"),
  ribeye_2: require("../../assets/images/western/Ribeye/Ribeye Mushroom.jpg"),
  ribeye_3: require("../../assets/images/western/Ribeye/Ribeye Cheese.jpg"),

  /* ================= FISH ================= */
  fish_1: require("../../assets/images/western/Fish/Fish N Chips.jpg"),
  fish_2: require("../../assets/images/western/Fish/Green Fishcurry.jpg"),
  fish_3: require("../../assets/images/western/Fish/Grilled Salamon.jpg"),

  /* ================= DESSERT ================= */
  dessert_1: require("../../assets/images/western/Dessert/Dark Lava Cake.jpg"),
  dessert_2: require("../../assets/images/western/Dessert/Mixberry Cheese Cake.jpg"),
  dessert_3: require("../../assets/images/western/Dessert/P.Panocotta.jpg"),
  dessert_4: require("../../assets/images/western/Dessert/Sticky Dates.jpg"),
};
const DEFAULT_IMAGE = require("../../assets/images/indian/basmati_rice/Chicken Briyani.jpg");

interface FoodItem {
  id: string;
  name: string;
  price: number;
}

export default function WesternKitchen() {
  const router = useRouter();
  const orderContext = getOrderContext();

  React.useEffect(() => {
    if (!orderContext) {
      router.replace("/(tabs)/category");
    } else {
      const { setCurrentContext, getContextId } = require("../cartStore");
      setCurrentContext(getContextId(orderContext));
    }
  }, [orderContext, router]);

  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);

  const availableWidth = width - (width > 900 ? 350 : 0) - (width > 900 ? 20 : 32);
  let dishColumns = 2;
  if (width > 800) dishColumns = 3;
  if (width > 1200) dishColumns = 4;

  const [cart, setCart] = useState(getCart());
  const [selectedGroup, setSelectedGroup] = useState("Appetizer");

  const [showCustomize, setShowCustomize] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  const [spicy, setSpicy] = useState("Medium");
  const [oil, setOil] = useState("Normal");
  const [salt, setSalt] = useState("Normal");
  const [note, setNote] = useState("");

  const items = ITEMS_BY_GROUP[selectedGroup] || [];

  const totalItems = useMemo(
    () => cart.reduce((s, i) => s + (i.qty || 0), 0),
    [cart],
  );

  useFocusEffect(
    useCallback(() => {
      setCart([...getCart()]);
    }, []),
  );

  const openCustomize = (item: FoodItem) => {
    setSelectedItem(item);
    setSpicy("Medium");
    setOil("Normal");
    setSalt("Normal");
    setNote("");
    setShowCustomize(true);
  };

  const confirmAdd = () => {
    if (!selectedItem) return;

    addToCartGlobal({
      id: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      spicy,
      oil,
      salt,
      note,
    });

    setCart([...getCart()]);
    setShowCustomize(false);
  };

  const renderFoodItem = ({ item }: { item: FoodItem }) => {
    return (
      <View style={{ flex: 1, maxWidth: `${100 / dishColumns}%` }}>
        <TouchableOpacity
          style={styles.foodCard}
          onPress={() => openCustomize(item)}
          activeOpacity={0.8}
        >
          <Image
            source={FOOD_IMAGES[item.id] || DEFAULT_IMAGE}
            style={styles.foodImage}
          />
          <View style={styles.dishContent}>
            <Text style={styles.foodName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.foodPrice}>$ {item.price.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ImageBackground
        source={require("../../assets/images/a13.jpg")}
        style={{ width, height }}
        resizeMode="cover"
      >
        <View style={styles.backgroundOverlay} />
        <View style={styles.overlay}>
          {/* RESPONSIVE DUAL-PANE WRAPPER */}
          <View style={{ flex: 1, flexDirection: width > 900 ? "row" : "column", padding: width > 900 ? 10 : 0, paddingTop: width > 900 ? 10 : 40 }}>
            {/* MAIN CONTENT SURFACE */}
            <BlurView intensity={50} tint="dark" style={[styles.mainContentSurface, width > 900 ? { flex: 1, padding: 10 } : { flex: 1, padding: 8, margin: 8 }]}>
              {/* HEADER */}
              <View style={styles.header}>
                <Text style={styles.title}>WESTERN KITCHEN</Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {width <= 900 && (
                    <Pressable
                      onPress={() => router.replace("/cart")}
                      style={styles.cartBtn}
                    >
                      <Text style={styles.cartText}>Cart</Text>
                      {totalItems > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{totalItems}</Text>
                        </View>
                      )}
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => router.replace("/(tabs)/category")}
                    style={styles.backBtn}
                  >
                    <Text style={styles.backText}>Back</Text>
                  </Pressable>
                </View>
              </View>

              {/* KITCHENS CATEGORY CARDS */}
              <View style={styles.kitchensContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.kitchensScroll}
                >
                  {KITCHENS.map((k) => {
                    const isActive = k.name === ACTIVE_KITCHEN;
                    return (
                      <TouchableOpacity
                        key={k.id}
                        style={[
                          styles.kitchenCard,
                          isActive ? styles.kitchenCardActive : styles.kitchenCardInactive,
                        ]}
                        onPress={() => {
                          if (!isActive) router.replace(k.route as any);
                        }}
                      >
                        <Text style={[styles.kitchenIcon, { marginBottom: 4 }]}>{k.icon}</Text>
                        <Text
                          style={[
                            styles.kitchenName,
                            { color: isActive ? "#FFFFFF" : "#9CA3AF" },
                          ]}
                          numberOfLines={2}
                        >
                          {k.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* SUB CATEGORY PILLS */}
              <View style={{ marginBottom: 12 }}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingHorizontal: 12 }}
                >
                  {GROUPS.map((g) => {
                    const active = g.name === selectedGroup;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.chip, active ? styles.active : styles.inactive]}
                        onPress={() => {
                          setSelectedGroup(g.name);
                          listRef.current?.scrollToOffset({ offset: 0, animated: true });
                        }}
                      >
                        <Text
                          style={{
                            color: active ? "#FFFFFF" : "#D1D5DB",
                            fontWeight: "700",
                          }}
                        >
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ITEMS GRID */}
              <FlatList
                ref={listRef}
                data={items}
                numColumns={dishColumns}
                key={dishColumns + selectedGroup}
                keyExtractor={(i) => i.id}
                columnWrapperStyle={{ gap: 12 }}
                contentContainerStyle={{ gap: 12, paddingBottom: 120, paddingTop: 10 }}
                renderItem={renderFoodItem}
                showsVerticalScrollIndicator={false}
              />
            </BlurView>

            {/* SIDEBAR COMPONENT */}
            {width > 900 && <CartSidebar width={350} />}
          </View>

      {/* MODAL */}
      <Modal visible={showCustomize} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modifierContainer}>
            <Text style={styles.modalTitle}>{selectedItem?.name}</Text>

            <Text style={styles.modalLabel}>Spicy</Text>
            <View style={styles.modifierRow}>
              {["Less", "Medium", "Extra"].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setSpicy(v)}
                  style={[styles.modifierButton, spicy === v && styles.selectedModifier]}
                >
                  <Text style={{ color: spicy === v ? "#052b12" : "#fff", fontWeight: "800" }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Oil</Text>
            <View style={styles.modifierRow}>
              {["Less", "Normal"].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setOil(v)}
                  style={[styles.modifierButton, oil === v && styles.selectedModifier]}
                >
                  <Text style={{ color: oil === v ? "#052b12" : "#fff", fontWeight: "800" }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Salt</Text>
            <View style={styles.modifierRow}>
              {["Less", "Normal"].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setSalt(v)}
                  style={[styles.modifierButton, salt === v && styles.selectedModifier]}
                >
                  <Text style={{ color: salt === v ? "#052b12" : "#fff", fontWeight: "800" }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Special instruction..."
              placeholderTextColor="#888"
              value={note}
              onChangeText={setNote}
              style={styles.specialInput}
              multiline
            />

            <View style={styles.modifierFooter}>
              <TouchableOpacity
                onPress={() => setShowCustomize(false)}
                style={styles.cancelBtn}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmAdd}
                style={styles.addBtn}
              >
                <Text style={{ color: "#052b12", fontWeight: "900" }}>Add to Cart</Text>
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

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  mainContentSurface: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  title: { color: "#9ef01a", fontWeight: "800", fontSize: 16 },

  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  backText: { color: "#fff", fontWeight: "700" },

  cartBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cartText: { color: "#052b12", fontWeight: "900" },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  kitchensContainer: { paddingVertical: 12, marginBottom: 10 },
  kitchensScroll: { paddingHorizontal: 8, gap: 8 },

  kitchenCard: {
    width: 110,
    height: 110,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  kitchenCardActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  kitchenCardInactive: { backgroundColor: "rgba(255,255,255,0.05)" },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  kitchenIcon: { fontSize: 24 },
  kitchenName: { fontWeight: "800", fontSize: 11, textAlign: "center" },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  active: { backgroundColor: "#22c55e" },
  inactive: { backgroundColor: "rgba(255,255,255,0.1)" },

  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  foodCard: {
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  foodImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  dishContent: {
    padding: 10,
  },
  foodName: { 
    color: "#f3f4f6", 
    fontWeight: "700", 
    fontSize: 15, 
    marginBottom: 4 
  },
  foodPrice: {
    color: "#22c55e",
    fontWeight: "800",
    fontSize: 14,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modifierContainer: {
    width: "92%",
    maxWidth: 420,
    borderRadius: 18,
    backgroundColor: "#1f2937",
    padding: 20,
  },
  modalTitle: {
    color: "#9ef01a",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 10,
  },
  modalLabel: { color: "#fff", marginTop: 10, fontWeight: "700" },

  modifierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  modifierButton: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#374151",
    alignItems: "center",
  },
  selectedModifier: {
    backgroundColor: "#22c55e",
  },

  specialInput: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#111827",
    color: "white",
    minHeight: 80,
    textAlignVertical: "top",
  },

  modifierFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#4b5563",
    alignItems: "center",
  },
  addBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#22c55e",
    alignItems: "center",
  },
});
