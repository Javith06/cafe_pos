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

/* ================= TYPES ================= */

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

  const listRef = useRef<FlatList>(null);

  /* ================= RESPONSIVE ================= */

  let columns = 2;
  if (width > 800) columns = 3;
  if (width > 1200) columns = 4;

  /* ================= LOAD ================= */

  useEffect(() => {
    fetch(`${API}/kitchens`)
      .then(res => res.json())
      .then(data => {
        setKitchens(data);
        if (data.length > 0) loadGroups(data[0].KitchenTypeName);
      });
  }, []);

  const loadGroups = async (kitchen: string) => {
    setSelectedKitchen(kitchen);

    const res = await fetch(`${API}/dishgroups`);
    const data = await res.json();

    setGroups(data);

    if (data.length > 0) {
      loadDishes(data[0].DishGroupId);
    }
  };

  const loadDishes = (groupId: string) => {
    setSelectedGroup(groupId);

    fetch(`${API}/dishes/${groupId}`)
      .then(res => res.json())
      .then(data => setItems(data || []));

    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  /* ================= CART ================= */

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

  /* ================= UI ================= */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ flex: 1, flexDirection: width > 900 ? "row" : "column" }}>

        {/* MAIN */}
        <BlurView intensity={40} tint="dark" style={styles.main}>

          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>{selectedKitchen}</Text>

            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/category")}
              style={styles.backBtn}
            >
              <Text style={{ color: "#fff" }}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* KITCHENS */}
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
                  style={[
                    styles.kitchenCard,
                    active && styles.kitchenActive,
                  ]}
                  onPress={() => loadGroups(k.KitchenTypeName)}
                >
                  <Text style={styles.kitchenText}>
                    {k.KitchenTypeName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* GROUPS */}
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
                  style={[
                    styles.chip,
                    active && styles.activeChip,
                  ]}
                  onPress={() => loadDishes(g.DishGroupId)}
                >
                  <Text style={{ color: "#fff" }}>
                    {g.DishGroupName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* GRID */}
          <FlatList
            ref={listRef}
            data={items}
            numColumns={columns}
            key={columns}
            keyExtractor={i => i.DishId}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{
              gap: 10,                 
              paddingTop: 5,       
              paddingBottom: 80,
              flexGrow: 1,
            }}
            style={{
              marginTop: 0,         
                        }}
            ListHeaderComponent={null}
            ListEmptyComponent={
              <Text style={{ color: "#777", textAlign: "center", marginTop: 20 }}>
                No items
              </Text>
            }
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => addItem(item)}
                >
                  <Image
                    source={getImage(item.Name)}
                    style={styles.image}
                  />

                  <View style={styles.cardContent}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.Name}
                    </Text>

                    <Text style={styles.price}>
                      ₹ {item.Price}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          />
        </BlurView>

        {/* SIDEBAR */}
        {width > 900 && <CartSidebar width={350} />}
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  main: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },

  header: {
    height: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },

  title: {
    color: "#22c55e",
    fontWeight: "800",
    fontSize: 14,
  },

  backBtn: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  kitchenScroll: {
    height: 50,
    flexGrow: 0,
    marginBottom: 15,
  },

  kitchenRow: {
    gap: 10,
    paddingVertical: 0,
  },

  kitchenCard: {
    width: 100,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  kitchenActive: {
    backgroundColor: "#22c55e",
  },

  kitchenText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },

  groupScroll: {
    height: 35,
    flexGrow: 0,
    marginBottom: 4,
  },

  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 0,     
  },

  chip: {
    minWidth: 90,
    height: 35,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  activeChip: {
    backgroundColor: "#22c55e",
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
    padding: 8,
  },

  name: {
    color: "#111",
    fontWeight: "600",
    fontSize: 13,
  },

  price: {
    color: "#22c55e",
    fontWeight: "800",
    fontSize: 13,
  },
});
