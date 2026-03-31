import sys

def rewrite():
    with open('c:/Users/UNIPRO/Desktop/POS_Unipro/cafe_pos/app/sales-report-top.tsx', 'r', encoding='utf-8') as f:
        top_half = f.read()

    jsx_and_styles = """
  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.dollarIcon}>
              <Ionicons name="logo-usd" size={16} color="#4ade80" />
            </View>
            <Text style={styles.headerTitleText}>Sales Dashboard</Text>
          </View>

          <View style={styles.centerTabs}>
            {["Overview", "Daily", "Weekly", "Monthly", "Yearly"].map(tab => {
              const isActive = (selectedFilter === tab.toUpperCase()) || (tab === "Overview" && selectedFilter === "DAILY");
              return (
                <TouchableOpacity 
                  key={tab} 
                  onPress={() => setSelectedFilter(tab === "Overview" ? "DAILY" : tab.toUpperCase() as any)}
                  style={[styles.filterTab, isActive && styles.activeFilterTab]}
                >
                  <Text style={[styles.filterTabText, isActive && styles.activeFilterTabText]}>{tab}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.profileRow}>
            <Ionicons name="search" size={18} color="#64748b" style={styles.iconMargin} />
            <Ionicons name="notifications-outline" size={18} color="#64748b" style={styles.iconMargin} />
            <Ionicons name="menu" size={18} color="#64748b" style={styles.iconMargin} />
            <View style={styles.profileBox}>
              <View style={styles.avatar}><Text style={styles.avatarTxt}>S</Text></View>
              <View>
                <Text style={styles.profileName}>Sathish Kumar</Text>
                <Text style={styles.profileEmail}>sathish@gmail.com</Text>
              </View>
              <Ionicons name="chevron-down" size={12} color="#64748b" style={{ marginLeft: 6 }} />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Greeting */}
          <View style={styles.greetingSection}>
            <View style={styles.greetingIcons}>
              <Ionicons name="sunny-outline" size={16} color="#64748b" style={{marginBottom: 8}} />
              <Ionicons name="moon-outline" size={16} color="#22c55e" />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.greetingTitle}>Good morning, Sathish</Text>
              <Text style={styles.greetingSub}>Track your sales metrics and monitor performance.</Text>
            </View>
          </View>

          {/* Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardTitle}>Gross Revenue</Text>
                <View style={styles.cardBadge}><Text style={styles.cardBadgeTxt}>INIR</Text></View>
              </View>
              <Text style={styles.metricCardValue}>₹{formatCurrency(filteredMetrics.TotalSales).replace('$', '')}</Text>
              <Text style={styles.metricCardTrend}><Text style={{color: '#4ade80'}}>📈 18.2%</Text> this month  <Text style={{color: '#64748b', fontSize: 10, fontFamily: Fonts.medium}}>|  ₹1.65L this month</Text></Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardTitle}>Avg Check</Text>
                <View style={styles.cardBadge}><Text style={styles.cardBadgeTxt}>MKG</Text></View>
              </View>
              <Text style={styles.metricCardValue}>₹{formatCurrency(avgOrder).replace('$', '')}</Text>
              <Text style={styles.metricCardTrend}><Text style={{color: '#4ade80'}}>📈 14.5%</Text> this month</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardTitle}>Items</Text>
                <View style={styles.cardBadge}><Text style={styles.cardBadgeTxt}>2.46</Text></View>
              </View>
              <Text style={styles.metricCardValue}>{filteredMetrics.TotalItems}</Text>
              <Text style={styles.metricCardTrend}><Text style={{color: '#4ade80'}}>★ {filteredMetrics.TotalItems}</Text> this month</Text>
            </View>
          </View>

          {/* Main Layout */}
          <View style={styles.contentSplit}>
            
            {/* Payment Mix Graph */}
            <View style={styles.paymentMixSection}>
              <Text style={styles.sectionHeading}>Payment Mix</Text>
              <View style={styles.progressRowBig}>
                {paymentMix.cash > 0 && <View style={[styles.progressSegmentBig, { width: `${paymentMix.cash}%`, backgroundColor: "#22c55e" }]}><Text style={styles.segmentText}>{paymentMix.cash.toFixed(0)}%</Text></View>}
                {paymentMix.nets > 0 && <View style={[styles.progressSegmentBig, { width: `${paymentMix.nets}%`, backgroundColor: "#4ade80" }]}><Text style={styles.segmentText}>{paymentMix.nets.toFixed(0)}%</Text></View>}
                {paymentMix.card > 0 && <View style={[styles.progressSegmentBig, { width: `${paymentMix.card}%`, backgroundColor: "#3b82f6" }]}><Text style={styles.segmentText}>{paymentMix.card.toFixed(0)}%</Text></View>}
                {paymentMix.paynow > 0 && <View style={[styles.progressSegmentBig, { width: `${paymentMix.paynow}%`, backgroundColor: "#8b5cf6" }]}><Text style={styles.segmentText}>{paymentMix.paynow.toFixed(0)}%</Text></View>}
              </View>

              <View style={styles.legendGrid}>
                <View style={styles.legendCol}>
                  <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#22c55e'}]} /><Text style={styles.legendText}>CASH</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#8b5cf6'}]} /><Text style={styles.legendText}>PAYNOW</Text></View>
                </View>
                <View style={styles.legendCol}>
                  <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#4ade80'}]} /><Text style={styles.legendText}>NETS</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#3b82f6'}]} /><Text style={styles.legendText}>CARD</Text></View>
                </View>
              </View>
            </View>

            {/* Transactions Table */}
            <View style={styles.tableSectionBox}>
              <View style={styles.tableInnerTabs}>
                <View style={{flexDirection: 'row'}}>
                  {["Daily", "Weekly", "Monthly", "Yearly"].map(tab => (
                    <TouchableOpacity key={tab} onPress={() => setSelectedFilter(tab.toUpperCase() as any)} style={[styles.tableTab, selectedFilter === tab.toUpperCase() && styles.activeTableTab]}>
                      <Text style={[styles.tableTabText, selectedFilter === tab.toUpperCase() && styles.activeTableTabText]}>{tab}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.tableSearchBox}>
                  <Ionicons name="search" size={12} color="#475569" style={{marginRight: 6}} />
                  <TextInput placeholder="Search" style={styles.tableSearchInput} placeholderTextColor="#475569" value={searchQuery} onChangeText={setSearchQuery} />
                </View>
              </View>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Bill ID</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Payment</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Date & Time</Text>
              </View>

              <View style={styles.tableBodyFixed}>
                {filteredSales.slice(0, 50).map((item, idx) => (
                  <TouchableOpacity key={idx} style={styles.trRow} onPress={() => handleOrderPress(item)}>
                    <Text style={[styles.tdCell, styles.billIdTxt, { flex: 1.2 }]} numberOfLines={1}>{item.BillNo || item.SettlementID?.slice(0, 8) || "N/A"}</Text>
                    
                    <View style={[styles.tdCellBox, { flex: 1 }]}>
                      <View style={[styles.badgePay, { backgroundColor: item.PayMode==="CASH" ? "rgba(34,197,94,0.15)" : item.PayMode==="NETS" ? "rgba(163,230,53,0.15)" : item.PayMode==="CARD" ? "rgba(59,130,246,0.15)" : "rgba(139,92,246,0.15)" }]}>
                        <Ionicons name={getPaymentMethodIcon(item.PayMode)} size={10} color={item.PayMode==="CASH" ? "#4ade80" : item.PayMode==="NETS" ? "#a3e635" : item.PayMode==="CARD" ? "#60a5fa" : "#c084fc"} style={{ marginRight: 4 }} />
                        <Text style={[styles.badgePayTxt, { color: item.PayMode==="CASH" ? "#4ade80" : item.PayMode==="NETS" ? "#a3e635" : item.PayMode==="CARD" ? "#60a5fa" : "#c084fc" }]}>{item.PayMode}</Text>
                      </View>
                    </View>

                    <Text style={[styles.tdCell, { flex: 0.8, color: getStatusColor(item.Status || "PAID"), fontFamily: Fonts.semiBold, fontSize: 12 }]}>{(item.Status || "Completed")}</Text>
                    
                    <Text style={[styles.tdCell, { flex: 1.5, textAlign: 'right', color: '#cbd5e1' }]}>{formatDateTime(item.SettlementDate)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>
        </ScrollView>

        <Modal visible={!!selectedOrder} transparent animationType="fade" onRequestClose={() => setSelectedOrder(null)}>
          <BlurView intensity={15} tint="dark" style={styles.modalOverlay}>
            <TouchableOpacity activeOpacity={1} style={styles.modalDismiss} onPress={() => setSelectedOrder(null)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}># {selectedOrder?.BillNo || selectedOrder?.SettlementID?.slice(0, 8)}</Text>
                  <Text style={styles.modalSub}>{new Date(selectedOrder?.SettlementDate).toLocaleString()}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeBtn}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalBody}>
                <Text style={styles.orderLabel}>ORDER SUMMARY</Text>
                {loadingDetails ? <ActivityIndicator color="#22c55e" style={{ marginVertical: 30 }} /> : orderDetails.length > 0 ? (
                  <View style={{maxHeight: 250}}>
                    {orderDetails.map((item, idx) => (
                      <View key={idx} style={styles.orderItemRow}>
                        <Text style={styles.orderItemQty}>{item.Qty}x</Text>
                        <Text style={styles.orderItemName}>{item.DishName}</Text>
                        <Text style={styles.orderItemPrice}>${(item.Price * item.Qty).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                ) : <Text style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", marginVertical: 20 }}>No item data</Text>}
                <View style={styles.modalDivider} />
                <View style={{gap: 8}}>
                  <View style={[styles.orderItemRow, {marginBottom: 0}]}><Text style={{color:'#64748b'}}>Grand Total</Text><Text style={{color:'#fff', fontFamily:Fonts.black}}>${selectedOrder?.SysAmount?.toFixed(2)}</Text></View>
                  <View style={[styles.orderItemRow, {marginBottom: 0}]}><Text style={{color:'#64748b'}}>Payment Mode</Text><Text style={{color:'#fff', fontFamily:Fonts.bold}}>{selectedOrder?.PayMode}</Text></View>
                </View>
              </View>
            </View>
          </BlurView>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A08" },
  topHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 24, backgroundColor: "rgba(10,18,14,0.7)", borderBottomWidth: 1, borderBottomColor: "rgba(34,197,94,0.05)" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dollarIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(34,197,94,0.1)", justifyContent: "center", alignItems: "center" },
  headerTitleText: { color: "#fff", fontFamily: Fonts.bold, fontSize: 16, letterSpacing: 0.5 },
  centerTabs: { flexDirection: "row", backgroundColor: "rgba(15,23,20,0.8)", borderRadius: 30, padding: 4, borderWidth: 1, borderColor: "rgba(34,197,94,0.1)" },
  filterTab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  activeFilterTab: { backgroundColor: "rgba(34,197,94,0.15)" },
  filterTabText: { color: "#64748b", fontFamily: Fonts.semiBold, fontSize: 12 },
  activeFilterTabText: { color: "#4ade80", fontFamily: Fonts.bold },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconMargin: { marginRight: 8 },
  profileBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(15,23,20,0.8)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#1e293b", justifyContent: "center", alignItems: "center", marginRight: 8 },
  avatarTxt: { color: "#fff", fontSize: 12, fontFamily: Fonts.black },
  profileName: { color: "#fff", fontSize: 12, fontFamily: Fonts.bold },
  profileEmail: { color: "#64748b", fontSize: 9, fontFamily: Fonts.semiBold },
  
  scrollContent: { padding: 24, paddingBottom: 60 },
  greetingSection: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  greetingIcons: { width: 36, height: 60, borderRadius: 18, backgroundColor: "rgba(34,197,94,0.05)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(34,197,94,0.1)" },
  greetingTitle: { color: "#fff", fontSize: 24, fontFamily: Fonts.black, marginBottom: 4 },
  greetingSub: { color: "#64748b", fontSize: 13, fontFamily: Fonts.medium },
  
  metricsRow: { flexDirection: "row", justifyContent: "space-between", gap: 16, marginBottom: 24 },
  metricCard: { flex: 1, backgroundColor: "rgba(6,16,11,0.5)", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)", shadowColor: "#22c55e", shadowOpacity: 0.05, shadowRadius: 10 },
  metricCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  metricCardTitle: { color: "#e2e8f0", fontSize: 14, fontFamily: Fonts.bold },
  cardBadge: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cardBadgeTxt: { color: "#4ade80", fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  metricCardValue: { color: "#fff", fontSize: 28, fontFamily: Fonts.black, marginBottom: 8 },
  metricCardTrend: { color: "#94a3b8", fontSize: 11, fontFamily: Fonts.bold },

  contentSplit: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  paymentMixSection: { flex: 0.35, backgroundColor: "rgba(6,16,11,0.5)", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" },
  sectionHeading: { color: "#e2e8f0", fontSize: 15, fontFamily: Fonts.bold, marginBottom: 20 },
  progressRowBig: { height: 40, flexDirection: "row", borderRadius: 8, overflow: "hidden", marginBottom: 30 },
  progressSegmentBig: { height: "100%", justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: "#000" },
  segmentText: { color: "#000", fontFamily: Fonts.black, fontSize: 10 },
  legendGrid: { marginTop: 10 },
  legendCol: { flexDirection: "row", gap: 20, marginBottom: 16, flexWrap: "wrap", justifyContent: "space-around" },
  legendItem: { flexDirection: "row", alignItems: "center", width: "40%" },
  legendDot: { width: 10, height: 10, borderRadius: 3, marginRight: 8 },
  legendText: { color: "#94a3b8", fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1 },

  tableSectionBox: { flex: 0.65, backgroundColor: "rgba(6,16,11,0.5)", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" },
  tableInnerTabs: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  tableTab: { paddingHorizontal: 16, paddingVertical: 6 },
  activeTableTab: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 6 },
  tableTabText: { color: "#64748b", fontSize: 12, fontFamily: Fonts.bold },
  activeTableTabText: { color: "#fff" },
  tableSearchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 8, paddingHorizontal: 10, height: 32, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", minWidth: 150 },
  tableSearchInput: { flex: 1, color: "#fff", fontSize: 12, paddingVertical: 0 },
  tableHeaderRow: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  tableHeaderCell: { color: "#64748b", fontSize: 11, fontFamily: Fonts.bold, textTransform: "uppercase" },
  tableBodyFixed: { minHeight: 300 },
  trRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.02)" },
  tdCell: { color: "#fff", fontSize: 13, fontFamily: Fonts.medium },
  billIdTxt: { color: "#e2e8f0" },
  tdCellBox: { flexDirection: "row", alignItems: "center" },
  badgePay: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  badgePayTxt: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  tdAmountTxt: { color: "#fff", fontSize: 13, fontFamily: Fonts.bold, marginBottom: 2 },
  tdDateTxt: { color: "#64748b", fontSize: 11, fontFamily: Fonts.medium },

  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  modalDismiss: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  modalContent: { width: 400, backgroundColor: "#0f172a", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { color: "#fff", fontSize: 18, fontFamily: Fonts.black },
  modalSub: { color: "#4ade80", fontSize: 12, fontFamily: Fonts.bold },
  closeBtn: { padding: 4 },
  modalDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 16 },
  orderLabel: { color: "#64748b", fontSize: 11, fontFamily: Fonts.black, letterSpacing: 1, marginBottom: 12 },
  orderItemRow: { flexDirection: "row", marginBottom: 12, gap: 10, alignItems: "center", justifyContent: "space-between" },
  orderItemQty: { color: "#22c55e", fontSize: 14, fontFamily: Fonts.black, width: 30 },
  orderItemName: { flex: 1, color: "#e2e8f0", fontSize: 14, fontFamily: Fonts.bold },
  orderItemPrice: { color: "#fff", fontSize: 14, fontFamily: Fonts.black },
});
"""
    with open('c:/Users/UNIPRO/Desktop/POS_Unipro/cafe_pos/app/sales-report.tsx', 'w', encoding='utf-8') as f:
        f.write(top_half + jsx_and_styles)

rewrite()
