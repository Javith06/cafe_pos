import os
import re

CAT_FILE = 'c:/Users/UNIPRO/Desktop/POS_Unipro/cafe_pos/app/(tabs)/category.tsx'
SALES_FILE = 'c:/Users/UNIPRO/Desktop/POS_Unipro/cafe_pos/app/sales-report.tsx'

def fix_category():
    with open(CAT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    old_locks = """          setServerLocks(data);"""
    new_locks = """          setServerLocks(prev => {
             // Performance Fix: Deep compare to prevent 141+ components re-rendering
             if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
             return data;
          });"""

    if old_locks in content:
        content = content.replace(old_locks, new_locks)
    
    with open(CAT_FILE, 'w', encoding='utf-8') as f:
        f.write(content)


def fix_sales_report():
    with open(SALES_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Provide a way to change the selectedDate! We will stick it right into the headerSubtitle area.
    header_old = """<View>
            <Text style={styles.headerTitle}>Sales Dashboard</Text>
            <Text style={styles.headerSubtitle}>Real-time performance metrics</Text>
          </View>"""
    
    header_new = """<View>
            <Text style={styles.headerTitle}>Sales Dashboard</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <TouchableOpacity onPress={() => changeDate(-1)} style={{ padding: 4 }}>
                <Ionicons name="chevron-back" size={16} color="#4ade80" />
              </TouchableOpacity>
              <Text style={[styles.headerSubtitle, { marginHorizontal: 8, color: '#fff', fontWeight: '600' }]}>
                {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => changeDate(1)} style={{ padding: 4 }}>
                <Ionicons name="chevron-forward" size={16} color="#4ade80" />
              </TouchableOpacity>
            </View>
          </View>"""

    content = content.replace(header_old, header_new)

    # 2. Prevent activePaymentModes from being locked empty by AsyncStorage (which hides all records)
    modes_fail_old = """if (savedModes) setActivePaymentModes(JSON.parse(savedModes));
        if (savedTypes) setActiveOrderTypes(JSON.parse(savedTypes));"""
    
    modes_fail_new = """if (savedModes) {
          const parsed = JSON.parse(savedModes);
          if (parsed.length > 0) setActivePaymentModes(parsed);
        }
        if (savedTypes) {
          const parsedTypes = JSON.parse(savedTypes);
          if (parsedTypes.length > 0) setActiveOrderTypes(parsedTypes);
        }"""
    
    content = content.replace(modes_fail_old, modes_fail_new)

    # 3. Make selected filter selection also set dateRangeMode to "SINGLE" so tabs actually work!
    tabs_click_old = """onPress={() => setSelectedFilter(tab === "Overview" ? "DAILY" : tab.toUpperCase() as any)}"""
    tabs_click_new = """onPress={() => {
                    setSelectedFilter(tab === "Overview" ? "DAILY" : tab.toUpperCase() as any);
                    setDateRangeMode("SINGLE"); 
                  }}"""
    
    content = content.replace(tabs_click_old, tabs_click_new)

    with open(SALES_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

fix_category()
fix_sales_report()
print("Fixed both!")
