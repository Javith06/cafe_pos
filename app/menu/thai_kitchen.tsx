import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
FlatList,
Image,
ScrollView,
StyleSheet,
Text,
TouchableOpacity,
View
} from "react-native";

import CartSidebar from "../../components/CartSidebar";
import { addToCartGlobal, getCart } from "../../stores/cartStore"

const API = "http://localhost:3000";

/* ================= TYPES ================= */

type Kitchen = {
KitchenTypeId: number;
KitchenTypeName: string;
};

type DishGroup = {
DishGroupId: string;
DishGroupName: string;
};

type Dish = {
DishId: string;
Name: string;
DishCode: number;
Price?: number;
};

export default function IndianKitchen() {

const router = useRouter();

const [kitchens,setKitchens] = useState<Kitchen[]>([]);
const [groups,setGroups] = useState<DishGroup[]>([]);
const [items,setItems] = useState<Dish[]>([]);

const [selectedKitchen,setSelectedKitchen] = useState<string>("");
const [selectedGroup,setSelectedGroup] = useState<string>("");

const [cart,setCart] = useState<any[]>(getCart());

const [modifiers,setModifiers] = useState<any[]>([]);
const [showModifier,setShowModifier] = useState(false);
const [selectedDish,setSelectedDish] = useState<Dish | null>(null);

/* ================= LOAD KITCHENS ================= */

useEffect(() => {

fetch(`${API}/kitchens`)
.then(res => res.json())
.then((data: Kitchen[]) => {

setKitchens(data);

if (data && data.length > 0) {
loadGroups(data[0].KitchenTypeName);
}

})
.catch(err => console.log("Kitchen load error:", err));

}, []);

/* ================= LOAD GROUPS ================= */

const loadGroups = async(kitchen:string)=>{

try{

setSelectedKitchen(kitchen);

const res = await fetch(`${API}/dishgroups`);
const data = await res.json();

if(Array.isArray(data)){

setGroups(data);

if(data.length>0){
loadDishes(data[0].DishGroupId);
}

}else{

setGroups([]);

}

}catch(err){

console.error("Group load error:",err);

}

};

/* ================= LOAD DISHES ================= */

const loadDishes = (groupId:string)=>{

setSelectedGroup(groupId);

fetch(`${API}/dishes/${groupId}`)
.then(res=>res.json())
.then((data)=>{

if(Array.isArray(data)){
setItems(data);
}else{
setItems([]);
}

})
.catch(err=>console.log("Dish load error:",err));

};

/* ================= CART COUNT ================= */

const totalItems = useMemo(
()=>cart.reduce((s:number,i:any)=>s+(i.qty||0),0),
[cart]
);

/* ================= LOAD MODIFIERS ================= */

const loadModifiers = async(dish:Dish)=>{

try{

const res = await fetch(`${API}/modifiers/${dish.DishId}`);
const data = await res.json();

if(Array.isArray(data) && data.length>0){

setSelectedDish(dish);
setModifiers(data);
setShowModifier(true);

}else{

addItem(dish);

}

}catch(err){

console.log("Modifier load error:",err);

}

};

/* ================= ADD TO CART ================= */

const addItem = (item:Dish)=>{

addToCartGlobal({
id:item.DishId,
name:item.Name,
price:item.Price ?? 0
});

setCart([...getCart()]);

};

/* ================= IMAGE ================= */

const getImage = (name:string)=>{

const file = name
.replace(/[()]/g,"")
.replace(/\s+/g,"_")
.toLowerCase()+".jpg";

return{
uri:`${API}/images/${file}`
};

};

/* ================= UI ================= */

return(

<View style={{flex:1,flexDirection:"row",backgroundColor:"#000"}}>

<View style={{flex:1,padding:10}}>

{/* KITCHENS */}

<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}}>

{kitchens.map(k=>(

<TouchableOpacity
key={k.KitchenTypeId.toString()}
style={[
styles.kitchenBtn,
k.KitchenTypeName===selectedKitchen && styles.activeKitchen
]}
onPress={()=>loadGroups(k.KitchenTypeName)}

>

<Text style={styles.kitchenText}>
{k.KitchenTypeName}
</Text>

</TouchableOpacity>

))}

</ScrollView>

{/* GROUPS */}

<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}}>

{groups.map(g=>(

<TouchableOpacity
key={g.DishGroupId}
style={[
styles.groupBtn,
g.DishGroupId===selectedGroup && styles.activeGroup
]}
onPress={()=>loadDishes(g.DishGroupId)}

>

<Text style={styles.groupText}>
{g.DishGroupName}
</Text>

</TouchableOpacity>

))}

</ScrollView>

{/* DISH GRID */}

<FlatList
data={items}
numColumns={4}
keyExtractor={(item)=>item.DishId}
renderItem={({item})=>(

<TouchableOpacity
style={styles.card}
onPress={()=>loadModifiers(item)}

>

<Image source={getImage(item.Name)} style={styles.image}/>

<Text style={styles.name}>
{item.Name}
</Text>

<Text style={styles.price}>
$ {item.Price}
</Text>

</TouchableOpacity>

)}
/>

</View>

<CartSidebar width={350}/>

{/* MODIFIER POPUP */}

{showModifier && (

<View style={styles.modifierOverlay}>

<View style={styles.modifierBox}>

<Text style={styles.modTitle}>
Choose Price
</Text>

{modifiers.map((m:any)=>(

<TouchableOpacity
key={m.ModifierId}
style={styles.modBtn}
onPress={() => {

const price = parseFloat(m.ModifierName.replace("$","")) || 0;

addToCartGlobal({
id: selectedDish!.DishId + "_" + m.ModifierId,
name: selectedDish!.Name + " " + m.ModifierName,
price: price
});

setCart([...getCart()]);
setShowModifier(false);

}}

>

<Text style={{color:"#fff"}}>
{m.ModifierName} </Text>

</TouchableOpacity>

))}

</View>

</View>

)}

</View>

);

}

/* ================= STYLES ================= */

const styles = StyleSheet.create({

kitchenBtn:{
backgroundColor:"#333",
paddingVertical:14,
paddingHorizontal:20,
marginRight:10,
borderRadius:10,
minWidth:110,
alignItems:"center"
},

activeKitchen:{
backgroundColor:"#22c55e"
},

kitchenText:{
color:"#fff",
fontWeight:"bold",
fontSize:15
},

groupBtn:{
backgroundColor:"#444",
paddingVertical:12,
paddingHorizontal:18,
marginRight:8,
borderRadius:16,
minWidth:120,
alignItems:"center",
justifyContent:"center"
},

activeGroup:{
backgroundColor:"#16a34a"
},

groupText:{
color:"#fff",
fontSize:14
},

card:{
backgroundColor:"#111",
margin:8,
borderRadius:10,
padding:10,
width:160
},

image:{
width:"100%",
height:100,
borderRadius:6
},

name:{
color:"#fff",
marginTop:6,
fontSize:13
},

price:{
color:"#22c55e",
fontWeight:"bold"
},

modifierOverlay:{
position:"absolute",
top:0,
left:0,
right:0,
bottom:0,
backgroundColor:"rgba(0,0,0,0.7)",
justifyContent:"center",
alignItems:"center"
},

modifierBox:{
backgroundColor:"#111",
padding:20,
borderRadius:10,
width:300
},

modTitle:{
color:"#fff",
fontSize:18,
marginBottom:10
},

modBtn:{
backgroundColor:"#333",
padding:12,
marginVertical:5,
borderRadius:8
}

});
