import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { closeActiveOrder, findActiveOrder } from "./activeOrdersStore";
import { clearCart } from "./cartStore";
import { clearOrderContext, getOrderContext } from "./orderContextStore";
import { clearTable } from "./tableStatusStore";

export default function PaymentScreen() {

  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;

  const context = getOrderContext();
  const activeOrder = context ? findActiveOrder(context) : undefined;

  const cart = useMemo(() => activeOrder ? activeOrder.items : [], [activeOrder]);

  const [method, setMethod] = useState("CASH");
  const [cashInput, setCashInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [time, setTime] = useState(new Date());

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0),
    [cart]
  );

  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  const paidNum = parseFloat(cashInput) || 0;
  const change = Math.max(0, paidNum - total);

  const quickCash = [20, 50, 100, 200, 500, 1000];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const confirmPayment = () => {

    if (method === "CASH" && paidNum < total) return;

    setProcessing(true);

    setTimeout(() => {

      if (method === "CASH") {
        openDrawer();
      }

      if (activeOrder) {
        closeActiveOrder(activeOrder.orderId);
      }

      if (context?.orderType === "DINE_IN") {
        clearTable(context.section!, context.tableNo!);
      }

      setProcessing(false);
      setSuccess(true);

    }, 1200);

  };

  const handleDone = () => {
    clearCart();
    clearOrderContext();
    router.replace("/(tabs)/category");
  };

  const openDrawer = () => {
    console.log("Open Cash Drawer");
  };

  const Header = () => (
    <View style={styles.header}>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color="#fff"/>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>
        {context?.orderType === "DINE_IN" ? "DINE-IN" : "TAKEAWAY"} | Order {context?.tableNo || context?.takeawayNo || activeOrder?.orderId || "N/A"}
      </Text>

      <View style={styles.headerRight}>
        <Text style={styles.dateTime}>
          {time.toLocaleDateString()} | {time.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
        </Text>
      </View>

    </View>
  );

  return (

<SafeAreaView style={{flex:1, backgroundColor:"#000"}}>

<ImageBackground
source={require("../assets/images/a4.jpg")}
style={{width,height}}
resizeMode="cover"
>

<View style={styles.overlay}/>

<View style={styles.container}>

<Header/>

<View style={[styles.mainLayout, isMobile && styles.mobileLayout]}>

{/* LEFT PANEL */}

<View style={styles.leftPane}>

<Text style={styles.sectionLabel}>Grand Total</Text>
<Text style={styles.grandTotal}>${total.toFixed(2)}</Text>

<View style={styles.breakdown}>

<View>
<Text style={styles.breakLabel}>Subtotal</Text>
<Text style={styles.breakValue}>${subtotal.toFixed(2)}</Text>
</View>

<View>
<Text style={styles.breakLabel}>Tax</Text>
<Text style={styles.breakValue}>${tax.toFixed(2)}</Text>
</View>

</View>

</View>

{/* CENTER PANEL */}

<View style={styles.centerPane}>

<Text style={styles.sectionLabel}>Payment Method</Text>

<View style={styles.methodRow}>

{[
{ id:"CASH", icon:"money-bill-wave" },
{ id:"CARD", icon:"credit-card" },
{ id:"NETS", icon:"exchange-alt" },
{ id:"PAYNOW", icon:"qrcode" }
].map(m => (

<TouchableOpacity
key={m.id}
style={[
styles.methodCard,
method === m.id && styles.activeMethod
]}
onPress={() => setMethod(m.id)}
>

<FontAwesome5
name={m.icon}
size={20}
color={method===m.id?"#052b12":"#94a3b8"}
/>

<Text style={[
styles.methodText,
method===m.id && {color:"#052b12"}
]}>
{m.id}
</Text>

</TouchableOpacity>

))}

</View>

{/* CASH SECTION */}

{method === "CASH" && (

<>

<View style={styles.cashInputBox}>

<Text style={styles.currency}>$</Text>

<TextInput
style={styles.cashInput}
keyboardType="numeric"
value={cashInput}
onChangeText={setCashInput}
placeholder="20.00"
placeholderTextColor="#475569"
/>

</View>

<View style={styles.quickRow}>

{quickCash.map(v => (

<TouchableOpacity
key={v}
style={styles.quickBtn}
onPress={() => setCashInput(v.toFixed(2))}
>

<Text style={styles.quickText}>${v}</Text>

</TouchableOpacity>

))}

</View>

<View style={styles.changeBox}>

<Text style={styles.changeLabel}>Change</Text>
<Text style={styles.changeValue}>${change.toFixed(2)}</Text>

</View>

</>

)}

<View style={styles.microActions}>

<TouchableOpacity
style={styles.utilBtn}
onPress={()=>setCashInput("")}
>
<Ionicons name="close" size={18} color="#fff"/>
<Text style={styles.utilText}>Clear</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.utilBtn}
onPress={openDrawer}
>
<MaterialCommunityIcons name="gesture-tap" size={18} color="#fff"/>
<Text style={styles.utilText}>Open Drawer</Text>
</TouchableOpacity>

</View>

<TouchableOpacity
style={[
styles.confirmBtn,
(method==="CASH" && paidNum<total) && styles.disabled
]}
disabled={processing || (method==="CASH" && paidNum<total)}
onPress={confirmPayment}
>

{processing ? (
<ActivityIndicator color="#052b12"/>
) : (
<>
<Ionicons name="checkmark-circle" size={20} color="#052b12"/>
<Text style={styles.confirmText}>Confirm Payment</Text>
</>
)}

</TouchableOpacity>

</View>

{/* RIGHT PANEL */}

<View style={styles.rightPane}>

<BlurView intensity={40} tint="dark" style={styles.statusCard}>

{success ? (

<View style={styles.successBox}>

<Ionicons name="checkmark-circle" size={50} color="#22c55e"/>

<Text style={styles.successTitle}>Payment Received</Text>

<View style={styles.receiptRow}>
<Text style={styles.receiptLabel}>Total</Text>
<Text style={styles.receiptValue}>${total.toFixed(2)}</Text>
</View>

<View style={styles.receiptRow}>
<Text style={styles.receiptLabel}>Customer Given</Text>
<Text style={styles.receiptValue}>${paidNum.toFixed(2)}</Text>
</View>

<View style={styles.receiptRow}>
<Text style={[styles.receiptLabel,{color:"#22c55e"}]}>Change</Text>
<Text style={[styles.receiptValue,{color:"#22c55e"}]}>${change.toFixed(2)}</Text>
</View>

<TouchableOpacity
style={styles.doneBtn}
onPress={handleDone}
>
<Text style={styles.doneText}>Done</Text>
</TouchableOpacity>

</View>

) : (

<View style={styles.waitBox}>

<Ionicons name="wallet-outline" size={60} color="#1e293b"/>

<Text style={styles.waitText}>
Waiting for payment
</Text>

<Text style={styles.waitSub}>
Select method and confirm
</Text>

</View>

)}

</BlurView>

</View>

</View>

</View>

</ImageBackground>

</SafeAreaView>

);
}

const styles = StyleSheet.create({

overlay:{
...StyleSheet.absoluteFillObject,
backgroundColor:"rgba(0,0,0,0.45)"
},

container:{
flex:1,
padding:14
},

header:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
marginBottom:10
},

backBtn:{
flexDirection:"row",
alignItems:"center",
gap:6
},

backText:{
color:"#fff",
fontWeight:"700"
},

headerTitle:{
color:"#fff",
fontWeight:"900",
fontSize:16
},

headerRight:{
flexDirection:"row",
gap:10
},

dateTime:{
color:"#94a3b8",
fontSize:12
},

mainLayout:{
flex:1,
flexDirection:"row",
gap:16
},

mobileLayout:{
flexDirection:"column"
},

leftPane:{
flex:1
},

centerPane:{
flex:1.4
},

rightPane:{
flex:1
},

sectionLabel:{
color:"#94a3b8",
fontSize:12,
marginBottom:6
},

grandTotal:{
fontSize:44,
fontWeight:"900",
color:"#22c55e"
},

breakdown:{
flexDirection:"row",
gap:20,
marginTop:10
},

breakLabel:{
color:"#64748b",
fontSize:12
},

breakValue:{
color:"#fff",
fontSize:18,
fontWeight:"800"
},

methodRow:{
flexDirection:"row",
gap:8,
marginBottom:14
},

methodCard:{
flex:1,
height:60,
borderRadius:12,
backgroundColor:"rgba(255,255,255,0.05)",
justifyContent:"center",
alignItems:"center"
},

activeMethod:{
backgroundColor:"#22c55e"
},

methodText:{
color:"#94a3b8",
fontSize:12,
fontWeight:"800"
},

cashInputBox:{
flexDirection:"row",
alignItems:"center",
backgroundColor:"rgba(255,255,255,0.05)",
borderRadius:12,
height:55,
paddingHorizontal:14,
marginBottom:10
},

currency:{
color:"#94a3b8",
fontSize:22,
marginRight:6
},

cashInput:{
flex:1,
color:"#fff",
fontSize:28,
fontWeight:"900"
},

quickRow:{
flexDirection:"row",
flexWrap:"wrap",
gap:8
},

quickBtn:{
backgroundColor:"rgba(255,255,255,0.05)",
padding:10,
borderRadius:10
},

quickText:{
color:"#fff",
fontWeight:"800"
},

changeBox:{
marginTop:12
},

changeLabel:{
color:"#94a3b8"
},

changeValue:{
fontSize:32,
fontWeight:"900",
color:"#22c55e"
},

microActions:{
flexDirection:"row",
gap:10,
marginTop:12
},

utilBtn:{
flexDirection:"row",
alignItems:"center",
gap:6,
backgroundColor:"rgba(255,255,255,0.08)",
padding:10,
borderRadius:10
},

utilText:{
color:"#fff",
fontSize:12
},

confirmBtn:{
marginTop:14,
backgroundColor:"#22c55e",
height:50,
borderRadius:12,
flexDirection:"row",
alignItems:"center",
justifyContent:"center",
gap:8
},

confirmText:{
color:"#052b12",
fontWeight:"900",
fontSize:15
},

disabled:{
backgroundColor:"rgba(34,197,94,0.4)"
},

statusCard:{
flex:1,
borderRadius:20,
padding:16
},

waitBox:{
flex:1,
justifyContent:"center",
alignItems:"center"
},

waitText:{
color:"#fff",
fontWeight:"800",
marginTop:10
},

waitSub:{
color:"#64748b",
fontSize:12
},

successBox:{
flex:1,
alignItems:"center",
gap:10
},

successTitle:{
color:"#22c55e",
fontSize:20,
fontWeight:"900"
},

receiptRow:{
flexDirection:"row",
justifyContent:"space-between",
width:"100%"
},

receiptLabel:{
color:"#94a3b8"
},

receiptValue:{
color:"#fff",
fontWeight:"800"
},

doneBtn:{
marginTop:10,
backgroundColor:"#22c55e",
padding:12,
borderRadius:10
},

doneText:{
color:"#052b12",
fontWeight:"900"
}

});