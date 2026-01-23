
import os

file_path = r'c:\Users\Beste\Desktop\Projects\operational-placement-main\operational-placement-main\styles.css'
dropdown_css_path = r'c:\Users\Beste\Desktop\Projects\operational-placement-main\operational-placement-main\styles_dropdown.css'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Find the line with .archive-badge and keep it, discard everything after
cutoff_index = -1
for i, line in enumerate(lines):
    if '[data-theme="light"] .archive-badge' in line:
        # Looking for the closing brace
        if i + 2 < len(lines) and '}' in lines[i+2]:
            cutoff_index = i + 3
            break

if cutoff_index != -1:
    lines = lines[:cutoff_index]
    
    # Read the dropdown css
    with open(dropdown_css_path, 'r', encoding='utf-8') as f:
        dropdown_css = f.read()
    
    # Append
    lines.append('\n' + dropdown_css)
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Successfully fixed styles.css")
else:
    print("Could not find cutoff point in styles.css")
