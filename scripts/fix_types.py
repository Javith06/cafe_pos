import re
import sys

def fix_types():
    with open('c:/Users/UNIPRO/Desktop/POS_Unipro/cafe_pos/app/(tabs)/category.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # The IDE still thinks loadedSections expects strings, so we make sure it's Set<number>
    content = content.replace("loadedSections = useRef<Set<string>>", "loadedSections = useRef<Set<number>>")
    content = content.replace("loadedSections.current.has(String(sec))", "loadedSections.current.has(Number(sec))")

    # The error on Line 617 might also be the refresh button callback:
    content = content.replace("loadedSections.current.delete(activeTab)", "loadedSections.current.delete(Number(activeTab))")
    content = content.replace("fetchTablesForSection(activeTab)", "fetchTablesForSection(Number(activeTab))")

    # Fix the getContextId section parameter on line 664 to be string
    content = content.replace("section: activeTab,", "section: String(activeTab),")

    # Save
    with open('c:/Users/UNIPRO/Desktop/POS_Unipro/cafe_pos/app/(tabs)/category.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

fix_types()
