import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CartSidebar from "../../components/CartSidebar";
import { addToCartGlobal, getCart } from "../../stores/cartStore";

const API = "http://localhost:3000";

const kitchenIcons: Record<string, string> = {
  "THAI KITCHEN": "🍜",
  "INDIAN KITCHEN": "🍛",
  "SOUTH INDIAN": "🍲",
  "WESTERN KITCHEN": "🍔",
  DRINKS: "🥤",
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
  Name: string;
  Price?: number;
};

export default function MenuScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Dish[]>([]);

  const [selectedKitchen, setSelectedKitchen] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const [cart, setCart] = useState(getCart());
  const listRef = useRef<FlatList<Dish>>(null);

  let columns = 2;
  if (width > 800) columns = 3;
  if (width > 1200) columns = 4;

  useEffect(() => {
    fetch(`${API}/kitchens`)
      .then(res => res.json())
      .then(data => {
        const safe = Array.isArray(data) ? data : [];
        setKitchens(safe);
        if (safe.length > 0) loadGroups(safe[0].KitchenTypeName);
      })
      .catch(err => console.log("KITCHEN ERROR:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGroups = async (kitchen: string) => {
    setSelectedKitchen(kitchen);
    setSelectedGroup("");
    setGroups([]);
    setItems([]);

    try {
      const res = await fetch(`${API}/dishgroups/${kitchen}`);
      const data = await res.json();
      const safe = Array.isArray(data) ? data : [];

      setGroups(safe);
      if (safe.length > 0) loadDishes(safe[0].DishGroupId);
    } catch (err) {
      console.log("GROUP ERROR:", err);
    }
  };

  const loadDishes = (groupId: string) => {
    setSelectedGroup(groupId);

    fetch(`${API}/dishes/${groupId}`)
      .then(res => res.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(err => console.log("DISH ERROR:", err));

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  };

  const totalItems = useMemo(
    () => cart.reduce((s: number, i: any) => s + (i.qty || 0), 0),
    [cart]
  );

  const addItem = (item: Dish) => {
    addToCartGlobal({
      id: item.DishId,
      name: item.Name,
      price: item.Price ?? 0,
    });
    setCart([...getCart()]);
  };

  const getImage = (name: string) => {
    const file =
      name.replace(/[()]/g, "").replace(/\s+/g, "_").toLowerCase() + ".jpg";
    return { uri: `${API}/images/${file}` };
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.page, { flexDirection: width > 900 ? "row" : "column" }]}>
        <BlurView intensity={40} tint="dark" style={styles.main}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {selectedKitchen}
              </Text>
              {!!totalItems && (
                <Text style={styles.subTitle} numberOfLines={1}>
                  {totalItems} item{totalItems === 1 ? "" : "s"} in cart
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/category")}
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kitchenRow}
            style={styles.kitchenScroll}
          >
            {kitchens.map(k => {
              const active = k.KitchenTypeName === selectedKitchen;
              return (
                <TouchableOpacity
                  key={k.KitchenTypeId}
                  style={[styles.kitchenCard, active && styles.kitchenActive]}
                  onPress={() => loadGroups(k.KitchenTypeName)}
                  activeOpacity={0.85}
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupRow}
            style={styles.groupScroll}
          >
            {groups.map(g => {
              const active = g.DishGroupId === selectedGroup;
              return (
                <TouchableOpacity
                  key={g.DishGroupId}
                  style={[styles.chip, active && styles.activeChip]}
                  onPress={() => loadDishes(g.DishGroupId)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.chipText} numberOfLines={1}>
                    {g.DishGroupName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <FlatList
            ref={listRef}
            data={items}
            numColumns={columns}
            key={columns}
            keyExtractor={i => i.DishId}
            columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No items</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, { flex: 1 }]}
                onPress={() => addItem(item)}
                activeOpacity={0.9}
              >
                <Image source={getImage(item.Name)} style={styles.image} />
                <View style={styles.cardContent}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.Name}
                  </Text>
                  <Text style={styles.price} numberOfLines={1}>
                    ₹ {item.Price ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </BlurView>

        {width > 900 && <CartSidebar width={350} />}
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
    paddingHorizontal: 14,
    paddingTop: 6,
  },

  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 6,
  },

  title: {
    color: "#22c55e",
    fontWeight: "800",
    fontSize: 16,
  },

  subTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
  },

  backBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  backText: {
    color: "#fff",
    fontWeight: "700",
  },

  kitchenScroll: {
    height: 82,
    marginBottom: 6,
  },

  kitchenRow: {
    gap: 10,
    paddingRight: 6,
    alignItems: "center",
  },

  kitchenCard: {
    width: 112,
    height: 72,
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
    borderColor: "rgba(34,197,94,0.75)",
    shadowColor: "#22c55e",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },

  kitchenIcon: {
    fontSize: 20,
    marginBottom: 2,
  },

  kitchenText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 13,
  },

  groupScroll: {
    height: 44,
    marginBottom: 10,
  },

  groupRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 6,
    alignItems: "center",
  },

  chip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },

  activeChip: {
    backgroundColor: "#22c55e",
  },

  chipText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    maxWidth: 140,
  },

  gridRow: {
    gap: 10,
  },

  gridContent: {
    gap: 10,
    paddingBottom: 18,
  },

  emptyWrap: {
    paddingTop: 40,
    alignItems: "center",
  },

  emptyText: {
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: 110,
  },

  cardContent: {
    padding: 10,
    gap: 4,
  },

  name: {
    color: "#111",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 16,
  },

  price: {
    color: "#22c55e",
    fontWeight: "900",
    fontSize: 13,
  },
});

