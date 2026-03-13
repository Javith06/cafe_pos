import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
import CartSidebar from "../../components/CartSidebar";
import { addToCartGlobal, getCart } from "../cartStore";
import { getOrderContext } from "../orderContextStore";

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

const ACTIVE_KITCHEN = "INDIAN KITCHEN";

/* ================= GROUPS ================= */
const GROUPS = [
  { id: "g1", name: "TanDoor" },
  { id: "g2", name: "Breads" },
  { id: "g3", name: "Basmathi Rice" },
  { id: "g4", name: "Indian Veg" },
  { id: "g5", name: "Chicken" },
  { id: "g6", name: "Mutton" },
  { id: "g7", name: "Seafood" },
];

const ITEMS_BY_GROUP: Record<
  string,
  { id: string; name: string; price: number }[]
> = {
  TanDoor: [
    { id: "td1", name: "Tandoori Chicken(S)", price: 9.5 },
    { id: "td2", name: "Tandoori Chicken(M)", price: 9.5 },
    { id: "td3", name: "Tandoori Chicken(L)", price: 9.5 },

    { id: "td4", name: "Mix Chicken(S)", price: 9.5 },
    { id: "td5", name: "Mix Chicken(M)", price: 9.5 },
    { id: "td6", name: "Mix Chicken(L)", price: 9.5 },

    { id: "td7", name: "Chicken Hariyali(S)", price: 9.5 },
    { id: "td8", name: "Chicken Hariyali(M)", price: 9.5 },
    { id: "td9", name: "Chicken Hariyali(L)", price: 9.5 },

    { id: "td10", name: "Chicken Reshmi(S)", price: 9.5 },
    { id: "td11", name: "Chicken Reshmi(M)", price: 9.5 },
    { id: "td12", name: "Chicken Reshmi(L)", price: 9.5 },

    { id: "td13", name: "Chicken Iranian(S)", price: 9.5 },
    { id: "td14", name: "Chicken Iranian(M)", price: 9.5 },
    { id: "td15", name: "Chicken Iranian(L)", price: 9.5 },

    { id: "td16", name: "Seekh Kebab(S)", price: 9.5 },
    { id: "td17", name: "Seekh Kebab(M)", price: 9.5 },
    { id: "td18", name: "Seekh Kebab(L)", price: 9.5 },

    { id: "td19", name: "Chicken Tikka(S)", price: 9.5 },
    { id: "td20", name: "Chicken Tikka(M)", price: 9.5 },
    { id: "td21", name: "Chicken Tikka(L)", price: 9.5 },

    { id: "td22", name: "Paneer Tikka(S)", price: 9.5 },
    { id: "td23", name: "Paneer Tikka(M)", price: 9.5 },
    { id: "td24", name: "Paneer Tikka(L)", price: 9.5 },

    { id: "td25", name: "Fish Tikka(S)", price: 9.5 },
    { id: "td26", name: "Fish Tikka(M)", price: 9.5 },
    { id: "td27", name: "Fish Tikka(L)", price: 9.5 },

    { id: "td28", name: "Fish Hariyali(S)", price: 9.5 },
    { id: "td29", name: "Fish Hariyali(M)", price: 9.5 },
    { id: "td30", name: "Fish Hariyali(L)", price: 9.5 },

    { id: "td31", name: "Fish Reshmi(S)", price: 9.5 },
    { id: "td32", name: "Fish Reshmi(M)", price: 9.5 },
    { id: "td33", name: "Fish Reshmi(L)", price: 9.5 },

    { id: "td34", name: "Mix Fish (S)", price: 9.5 },
    { id: "td35", name: "Mix Fish (M)", price: 9.5 },
    { id: "td36", name: "Mix Fish (L)", price: 9.5 },

    { id: "td37", name: "Open Item", price: 9.5 },
  ],
  Breads: [
    { id: "br1", name: "Naan", price: 2.5 },
    { id: "br2", name: "Butter Naan", price: 2.5 },
    { id: "br3", name: "Garlic Naan", price: 2.0 },
    { id: "br4", name: "Cheese Naan", price: 2.5 },
    { id: "br5", name: "Kashmiri Naan", price: 2.5 },
    { id: "br6", name: "Kheema Naan", price: 2.5 },
    { id: "br7", name: "Paneer Kulcha", price: 2.5 },
    { id: "br8", name: "Garlic Onion Gulcha", price: 2.5 },
    { id: "br9", name: "T.Rotti", price: 2.5 },
    { id: "br10", name: "B.Rotti", price: 2.5 },
    { id: "br11", name: "Aloo Pratha", price: 2.5 },
    { id: "br12", name: "Methi Pratha", price: 2.5 },
    { id: "br13", name: "Poodhina Pratha", price: 2.5 },
  ],

  "Basmathi Rice": [
    { id: "ri1", name: "Chicken Biriyani", price: 2.5 },
    { id: "ri2", name: "Fish Biriyani", price: 2.5 },
    { id: "ri3", name: "Mutton Biriyani", price: 2.5 },
    { id: "ri4", name: "Prawn Biriyani", price: 2.5 },
    { id: "ri5", name: "Veg Biriyani", price: 2.5 },
    { id: "ri6", name: "Peas Pilau", price: 2.5 },
    { id: "ri7", name: "Jeera Rice", price: 2.5 },
    { id: "ri8", name: "Kashmiri Pulav", price: 2.5 },
    { id: "ri9", name: "Biriyani Rice", price: 2.5 },
    { id: "ri10", name: "Basmathi Rice(Plain)", price: 2.5 },
    { id: "ri11", name: "PapaDam Set", price: 2.5 },
  ],

  "Indian Veg": [
    { id: "iv1", name: "Paneer Butter Masala", price: 2.5 },
    { id: "iv2", name: "Bhindi Masala", price: 2.5 },
    { id: "iv3", name: "Brinjal Masala", price: 2.5 },
    { id: "iv4", name: "Palak Paneer", price: 2.5 },
    { id: "iv5", name: "Navrattan Korma", price: 2.5 },
    { id: "iv6", name: "Kadai Paneer", price: 2.5 },
    { id: "iv7", name: "Malai Kofta", price: 2.5 },
    { id: "iv8", name: "Shai Paneer", price: 2.5 },
    { id: "iv9", name: "Paneer Tikka Masala", price: 2.5 },
    { id: "iv10", name: "Matter Paneer", price: 2.5 },
    { id: "iv11", name: "Aloo Gobi", price: 2.5 },
    { id: "iv12", name: "Aloo Matar Makani", price: 2.5 },
    { id: "iv13", name: "Peas Mushroom", price: 2.5 },
    { id: "iv14", name: "Channa Masala", price: 2.5 },
    { id: "iv15", name: "Bitter Gourd", price: 2.5 },
    { id: "iv16", name: "Yellow Dal", price: 2.5 },
    { id: "iv17", name: "Mix Raitha", price: 2.5 },
    { id: "iv18", name: "Dal Makani", price: 2.5 },
    { id: "iv19", name: "Plain Yogurt", price: 2.5 },
    { id: "iv20", name: "Dal Palak", price: 2.5 },
    { id: "iv21", name: "Chilli Paneer", price: 2.5 },
    { id: "iv22", name: "Aloo Palak", price: 2.5 },
    { id: "iv23", name: "Gobi Manchurian", price: 2.5 },
    { id: "iv24", name: "Veg Kofta Curry", price: 2.5 },
    { id: "iv25", name: "Mix Veg Curry", price: 2.5 },
    { id: "iv26", name: "Kadai Vegetable", price: 2.5 },
    { id: "iv27", name: "Bhindi Jaipuri", price: 2.5 },
  ],

  Chicken: [
    { id: "ch1", name: "Chicken Korma", price: 2.5 },
    { id: "ch2", name: "Chicken Spinach", price: 2.5 },
    { id: "ch3", name: "Chicken Masala", price: 2.5 },
    { id: "ch4", name: "Chicken Vartha", price: 2.5 },
    { id: "ch5", name: "Chicken Jalfrazi", price: 2.5 },
    { id: "ch6", name: "Butter Chicken", price: 2.5 },
    { id: "ch7", name: "Chicken Tikka Masala", price: 2.5 },
    { id: "ch8", name: "Kadai Chicken", price: 2.5 },
    { id: "ch9", name: "Chicken Vindaloo", price: 2.5 },
    { id: "ch10", name: "Chicken Muglai", price: 2.5 },
    { id: "ch11", name: "Chilli Chicken", price: 2.5 },
    { id: "ch12", name: "Pepper Chicken", price: 2.5 },
    { id: "ch13", name: "Chicken Dahiwala", price: 2.5 },
    { id: "ch14", name: "Chicken Tawa Masala", price: 2.5 },
    { id: "ch15", name: "Chicken Hydrabadi", price: 2.5 },
  ],

  Mutton: [
    { id: "mu1", name: "Mutton Kurma", price: 2.5 },
    { id: "mu2", name: "Mutton Masala", price: 2.5 },
    { id: "mu3", name: "Mutton Do Piaza", price: 2.5 },
    { id: "mu4", name: "Mutton Keema", price: 2.5 },
    { id: "mu5", name: "Kadai Mutton", price: 2.5 },
    { id: "mu6", name: "Mutton Rogan Josh", price: 2.5 },
    { id: "mu7", name: "Mutton Jafrazi", price: 2.5 },
    { id: "mu8", name: "Mutton Vindaloo", price: 2.5 },
    { id: "mu9", name: "Mutton Muglai", price: 2.5 },
    { id: "mu10", name: "Mutton Spinach", price: 2.5 },
    { id: "mu11", name: "Chilli Mutton", price: 2.5 },
    { id: "mu12", name: "Pepper Mutton", price: 2.5 },
  ],

  Seafood: [
    { id: "sf1", name: "Kadai Fish", price: 2.5 },
    { id: "sf2", name: "Fish Vindaloo", price: 2.5 },
    { id: "sf3", name: "Madras Fish Curry", price: 2.5 },
    { id: "sf4", name: "Fish Masala", price: 2.5 },
    { id: "sf5", name: "Prawn Vindaloo", price: 2.5 },
    { id: "sf6", name: "Kadai Prawn", price: 2.5 },
    { id: "sf7", name: "Prawn Masala", price: 2.5 },
    { id: "sf8", name: "Prawn Curry", price: 2.5 },
    { id: "sf9", name: "Prawn Do Piaza", price: 2.5 },
    { id: "sf10", name: "Prawn Jalfrazi", price: 2.5 },
    { id: "sf11", name: "Prawn Malwani", price: 2.5 },
    { id: "sf12", name: "Prawn Jhinga Tomato", price: 2.5 },
    { id: "sf13", name: "Prawn Hydrabadi", price: 2.5 },
    { id: "sf14", name: "Chilli Fish", price: 2.5 },
    { id: "sf15", name: "Pepper Fish", price: 2.5 },
    { id: "sf16", name: "Chilli Prawn", price: 2.5 },
    { id: "sf17", name: "Pepper Prawn", price: 2.5 },
    { id: "sf18", name: "Fish Head Curry", price: 2.5 },
  ],
};

/* ================= IMAGES ================= */
const FOOD_IMAGES: Record<string, any> = {
  //------------Tandoor---------//
  td1: require("../../assets/images/indian/TanDoor/tandoor S.jpg"),
  td2: require("../../assets/images/indian/TanDoor/Tandroor M.jpg"),
  td3: require("../../assets/images/indian/TanDoor/Tandroor L.jpg"),
  td4: require("../../assets/images/indian/TanDoor/mix Chicken S.jpg"),
  td5: require("../../assets/images/indian/TanDoor/mix Chicken M.jpg"),
  td6: require("../../assets/images/indian/TanDoor/mix Chicken L.jpg"),
  td7: require("../../assets/images/indian/TanDoor/Tikka S.jpg"),
  td8: require("../../assets/images/indian/TanDoor/Tikka M.jpg"),
  td9: require("../../assets/images/indian/TanDoor/Tikka L.jpg"),
  td10: require("../../assets/images/indian/TanDoor/hariyali_chicken_s.jpg"),
  td11: require("../../assets/images/indian/TanDoor/hariyali_chicken_m.jpg"),
  td12: require("../../assets/images/indian/TanDoor/hariyali_chicken_l.jpg"),
  td13: require("../../assets/images/indian/TanDoor/chicken_reshmmi_s.jpg"),
  td14: require("../../assets/images/indian/TanDoor/chicken_reshmmi_m.jpg"),
  td15: require("../../assets/images/indian/TanDoor/chicken_reshmmi_l.jpg"),
  td16: require("../../assets/images/indian/TanDoor/iranian chicken  S.jpg"),
  td17: require("../../assets/images/indian/TanDoor/iranian chicken  M.jpg"),
  td18: require("../../assets/images/indian/TanDoor/iranian chicken  L.jpg"),
  td19: require("../../assets/images/indian/TanDoor/seekh kabab S.jpg"),
  td20: require("../../assets/images/indian/TanDoor/seekh kabab M.jpg"),
  td21: require("../../assets/images/indian/TanDoor/seekh kabab L.jpg"),
  td22: require("../../assets/images/indian/TanDoor/panner tikka S.jpg"),
  td23: require("../../assets/images/indian/TanDoor/panner tikka M.jpg"),
  td24: require("../../assets/images/indian/TanDoor/panner tikka L.jpg"),
  td25: require("../../assets/images/indian/TanDoor/fish_tikka_s.jpg"),
  td26: require("../../assets/images/indian/TanDoor/fish_tikka_m.jpg"),
  td27: require("../../assets/images/indian/TanDoor/fish_tikka_l.jpg"),
  td28: require("../../assets/images/indian/TanDoor/fish_hariyali_s.jpg"),
  td29: require("../../assets/images/indian/TanDoor/fish_hariyali_m.jpg"),
  td30: require("../../assets/images/indian/TanDoor/fish_hariyali_l.jpg"),
  td31: require("../../assets/images/indian/TanDoor/fish_reshmi_s.jpg"),
  td32: require("../../assets/images/indian/TanDoor/fish_reshmi_m.jpg"),
  td33: require("../../assets/images/indian/TanDoor/fish_reshmi_l.jpg"),
  td34: require("../../assets/images/indian/TanDoor/MIx Fish S.jpg"),
  td35: require("../../assets/images/indian/TanDoor/Mix Fish M.jpg"),
  td36: require("../../assets/images/indian/TanDoor/Mix Fish L.jpg"),
  td37: require("../../assets/images/indian/TanDoor/Open Item.jpg"),

  //----------Breads--------//

  br1: require("../../assets/images/indian/Breads/Plain Naan.jpg"),
  br2: require("../../assets/images/indian/Breads/Butter Naan.jpg"),
  br3: require("../../assets/images/indian/Breads/Garlic Naan.jpg"),
  br4: require("../../assets/images/indian/Breads/Cheese Naan.jpg"),
  br5: require("../../assets/images/indian/Breads/Kashmiri Naan.jpg"),
  br6: require("../../assets/images/indian/Breads/Keema Naan.jpg"),
  br7: require("../../assets/images/indian/Breads/paneer Kulcha.jpg"),
  br8: require("../../assets/images/indian/Breads/garlic onion kulcha.jpg"),
  br9: require("../../assets/images/indian/Breads/t.roti.jpg"),
  br10: require("../../assets/images/indian/Breads/B.Roti.jpg"),
  br11: require("../../assets/images/indian/Breads/aloo  parathe.jpg"),
  br12: require("../../assets/images/indian/Breads/methi pratha.jpg"),
  br13: require("../../assets/images/indian/Breads/Poodhina Pratha.jpg"),

  //------------------Basmati_Rice-------------//

  ri1: require("../../assets/images/indian/basmati_rice/Chicken Briyani.jpg"),
  ri2: require("../../assets/images/indian/basmati_rice/Fish Biryani.jpg"),
  ri3: require("../../assets/images/indian/basmati_rice/mutton biryani.jpg"),
  ri4: require("../../assets/images/indian/basmati_rice/Prawn Biryani.jpg"),
  ri5: require("../../assets/images/indian/basmati_rice/veg biryani.jpg"),
  ri6: require("../../assets/images/indian/basmati_rice/Pea Pulao.jpg"),
  ri7: require("../../assets/images/indian/basmati_rice/jeera rice.jpg"),
  ri8: require("../../assets/images/indian/basmati_rice/Kashmiri Pulav.jpg"),
  ri9: require("../../assets/images/indian/basmati_rice/Biryani Rice.jpg"),
  ri10: require("../../assets/images/indian/basmati_rice/basmati rice (plain).jpg"),
  ri11: require("../../assets/images/indian/basmati_rice/papaDam Set.jpg"),

  //----------Indian Veg -----------//
  iv1: require("../../assets/images/indian/Indian Veg/Paneer  B Masala.jpg"),
  iv2: require("../../assets/images/indian/Indian Veg/Bhindi Masala.jpg"),
  iv3: require("../../assets/images/indian/Indian Veg/Baingan Masala.jpg"),
  iv4: require("../../assets/images/indian/Indian Veg/palak paneer.jpg"),
  iv5: require("../../assets/images/indian/Indian Veg/Navratan Korma.jpg"),
  iv6: require("../../assets/images/indian/Indian Veg/Kadai Paneer.jpg"),
  iv7: require("../../assets/images/indian/Indian Veg/malai Kofta.jpg"),
  iv8: require("../../assets/images/indian/Indian Veg/Shahi Paneer.jpg"),
  iv9: require("../../assets/images/indian/Indian Veg/Paneer Tikka Masala.jpg"),
  iv10: require("../../assets/images/indian/Indian Veg/Matar Paneer.jpg"),
  iv11: require("../../assets/images/indian/Indian Veg/Aloo Gobi.jpg"),
  iv12: require("../../assets/images/indian/Indian Veg/Aloo Matra Makani.jpg"),
  iv13: require("../../assets/images/indian/Indian Veg/Peas Mushroom.jpg"),
  iv14: require("../../assets/images/indian/Indian Veg/Chana Masala.jpg"),
  iv15: require("../../assets/images/indian/Indian Veg/Bitter Gourd Stir Fy.jpg"),
  iv16: require("../../assets/images/indian/Indian Veg/yellow dal.jpg"),
  iv17: require("../../assets/images/indian/Indian Veg/mix Raitha.jpg"),
  iv18: require("../../assets/images/indian/Indian Veg/Dal Makani.jpg"),
  iv19: require("../../assets/images/indian/Indian Veg/plain yoghurt.jpg"),
  iv20: require("../../assets/images/indian/Indian Veg/Dal Palak.jpg"),
  iv21: require("../../assets/images/indian/Indian Veg/chilli paneer.jpg"),
  iv22: require("../../assets/images/indian/Indian Veg/Aloo Palak.jpg"),
  iv23: require("../../assets/images/indian/Indian Veg/Gobi Manchurian.jpg"),
  iv24: require("../../assets/images/indian/Indian Veg/veg kofta curry.jpg"),
  iv25: require("../../assets/images/indian/Indian Veg/mix veg curry.jpg"),
  iv26: require("../../assets/images/indian/Indian Veg/kadai vegtable.jpg"),
  iv27: require("../../assets/images/indian/Indian Veg/Bhindi Jaipuri.jpg"),

  //-------------CHICKEN---------//
  ch1: require("../../assets/images/indian/Chicken/Chicken Korma.jpg"),
  ch2: require("../../assets/images/indian/Chicken/chicken spinach.jpg"),
  ch3: require("../../assets/images/indian/Chicken/Chicken  Masala.jpg"),
  ch4: require("../../assets/images/indian/Chicken/chicken vartha.jpg"),
  ch5: require("../../assets/images/indian/Chicken/Chicken Jalfrezi.jpg"),
  ch6: require("../../assets/images/indian/Chicken/butter_chicken.jpg"),
  ch7: require("../../assets/images/indian/Chicken/Chicken Tikka Masala.jpg"),
  ch8: require("../../assets/images/indian/Chicken/Kadai Chicken.jpg"),
  ch9: require("../../assets/images/indian/Chicken/Chicken Vindaloo.jpg"),
  ch10: require("../../assets/images/indian/Chicken/Chicken Mughlai.jpg"),
  ch11: require("../../assets/images/indian/Chicken/chilli chicken.jpg"),
  ch12: require("../../assets/images/indian/Chicken/pepper chicken.jpg"),
  ch13: require("../../assets/images/indian/Chicken/chicken dahiwala.jpg"),
  ch14: require("../../assets/images/indian/Chicken/chicken tawa masala.jpg"),
  ch15: require("../../assets/images/indian/Chicken/Chicken Hyderabadi.jpg"),

  //----------MUTTON----------//
  mu1: require("../../assets/images/indian/Mutton/mutton korma.jpg"),
  mu2: require("../../assets/images/indian/Mutton/mutton masala.jpg"),
  mu3: require("../../assets/images/indian/Mutton/Mutton Do Pyaza.jpg"),
  mu4: require("../../assets/images/indian/Mutton/mutton keema.jpg"),
  mu5: require("../../assets/images/indian/Mutton/kadai mutton.jpg"),
  mu6: require("../../assets/images/indian/Mutton/mutton rogan josh.jpg"),
  mu7: require("../../assets/images/indian/Mutton/Mutton Jalfrezi.jpg"),
  mu8: require("../../assets/images/indian/Mutton/mutton vindaloo.jpg"),
  mu9: require("../../assets/images/indian/Mutton/Mughlai Mutton.jpg"),
  mu10: require("../../assets/images/indian/Mutton/mutton spinach.jpg"),
  mu11: require("../../assets/images/indian/Mutton/chilli mutton.jpg"),
  mu12: require("../../assets/images/indian/Mutton/Mutton Pepper.jpg"),

  //---------SEA FOOD---------//
  sf1: require("../../assets/images/indian/Sea Food/Kadai Fish.jpg"),
  sf2: require("../../assets/images/indian/Sea Food/Fish Vindaloo.jpg"),
  sf3: require("../../assets/images/indian/Sea Food/Madras Fish Curry.jpg"),
  sf4: require("../../assets/images/indian/Sea Food/Fish Masala.jpg"),
  sf5: require("../../assets/images/indian/Sea Food/Prawn  Vindaloo.jpg"),
  sf6: require("../../assets/images/indian/Sea Food/Kadai Prawn.jpg"),
  sf7: require("../../assets/images/indian/Sea Food/prawns masala.jpg"),
  sf8: require("../../assets/images/indian/Sea Food/prawns curry.jpg"),
  sf9: require("../../assets/images/indian/Sea Food/Prawn Do Piaza.jpg"),
  sf10: require("../../assets/images/indian/Sea Food/Prawn Jalfrezi.jpg"),
  sf11: require("../../assets/images/indian/Sea Food/prawn Malwani.jpg"),
  sf12: require("../../assets/images/indian/Sea Food/prawn jhinga Tomato.jpg"),
  sf13: require("../../assets/images/indian/Sea Food/Prawn Hydrabadi.jpg"),
  sf14: require("../../assets/images/indian/Sea Food/chilli Fish.jpg"),
  sf15: require("../../assets/images/indian/Sea Food/Pepper Fish.jpg"),
  sf16: require("../../assets/images/indian/Sea Food/Chilli Prawn.jpg"),
  sf17: require("../../assets/images/indian/Sea Food/Pepper Prawn.jpg"),
  sf18: require("../../assets/images/indian/Sea Food/Fish Head Curry.jpg"),
};

const DEFAULT_IMAGE = require("../../assets/images/indian/basmati_rice/Chicken Briyani.jpg");

interface FoodItem {
  id: string;
  name: string;
  price: number;
}

export default function IndianKitchen() {
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
  const [selectedGroup, setSelectedGroup] = useState("TanDoor");

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
        source={require("../../assets/images/a4.jpg")}
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
                <Text style={styles.title}>INDIAN KITCHEN</Text>

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
                  {GROUPS.map((g: { id: string; name: string }) => {
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
