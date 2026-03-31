import re
import sys

def fix_category():
    with open('c:/Users/UNIPRO/Desktop/POS_Unipro/cafe_pos/app/(tabs)/category.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix tabs ScrollView mapping
    old_tabs_map = """              {SECTIONS.map((section) => {
                const isActive = activeTab === section;
                const sectionTables = allTables.filter((t) => {
                  if (section === "SECTION_1") return t.DiningSection === 1;
                  if (section === "SECTION_2") return t.DiningSection === 2;
                  if (section === "SECTION_3") return t.DiningSection === 3;
                  if (section === "TAKEAWAY")  return t.DiningSection === 4;
                  return false;
                });
                const occupied = sectionTables.filter((t) =>
                  tables.some((st) => st.section === section && st.tableNo === t.label)
                ).length;

                return (
                  <TouchableOpacity
                    key={section}
                    onPress={() => setActiveTab(section)}
                    activeOpacity={0.75}
                    style={[
                      styles.tabBtn,
                      isActive && styles.activeTabBtn,
                    ]}
                  >
                    {/* Short code badge */}
                    <View style={[styles.tabCodeBadge, isActive && styles.activeTabCodeBadge]}>
                      <Text style={[styles.tabCodeText, isActive && styles.activeTabCodeText]}>
                        {SECTION_SHORT[section]}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.tabText,
                        isActive && styles.activeTabText,
                        { fontSize: isTablet ? 13 : 11 },
                      ]}
                    >
                      {SECTION_LABELS[section]}
                    </Text>
                    {occupied > 0 && (
                      <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                        <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                          {occupied}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}"""

    new_tabs_map = """              {dynamicSections.map((sec) => {
                const isActive = activeTab === sec.id;
                const activeColor = isActive ? "#22c55e" : "#e2e8f0";
                const occupied = countOccupied(sec.id);

                return (
                  <TouchableOpacity
                    key={sec.id}
                    onPress={() => setActiveTab(sec.id)}
                    activeOpacity={0.75}
                    style={[
                      styles.tabBtn,
                      isActive && styles.activeTabBtn,
                    ]}
                  >
                    <View style={[styles.tabCodeBadge, isActive && styles.activeTabCodeBadge]}>
                      <Text style={[styles.tabCodeText, isActive && styles.activeTabCodeText]}>
                        {sec.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.tabText,
                        isActive && styles.activeTabText,
                        { fontSize: isTablet ? 13 : 11 },
                      ]}
                    >
                      {sec.name}
                    </Text>
                    {occupied > 0 && (
                      <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                        <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                          {occupied}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}"""

    content = content.replace(old_tabs_map, new_tabs_map)

    # Fix other activeTab string comparisons 
    # SECTION_LABELS[activeTab] -> dynamicSections.find(s => s.id === activeTab)?.name || "Section"
    content = content.replace("{SECTION_LABELS[activeTab]}", "{dynamicSections.find(s => s.id === activeTab)?.name || 'Section'}")

    # occupiedCount -> countOccupied(activeTab)
    content = content.replace("{occupiedCount > 0 && (", "{countOccupied(activeTab) > 0 && (")
    content = content.replace("{occupiedCount} occupied", "{countOccupied(activeTab)} occupied")

    # t.section === activeTab -> t.section === String(activeTab)
    content = content.replace("t.section === activeTab", "t.section === String(activeTab)")

    # activeTab === "TAKEAWAY"
    content = content.replace('activeTab === "TAKEAWAY"', 'activeTab === 4')
    
    # st.section === section
    content = content.replace('st.section === section', 'st.section === String(section)')

    # loadedSections.current.has(section) -> parameter is now sectionId
    # Fix the duplicate loadedSections.current.delete(activeTab) in refresh btn
    content = content.replace("loadedSections.current.delete(activeTab); fetchTablesForSection(activeTab);", "loadedSections.current.delete(activeTab); fetchTablesForSection(activeTab);")
    
    # Write back
    with open('c:/Users/UNIPRO/Desktop/POS_Unipro/cafe_pos/app/(tabs)/category.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed.")

fix_category()
