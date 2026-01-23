
import os

file_path = r'c:\Users\Beste\Desktop\Projects\operational-placement-main\operational-placement-main\styles.css'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if '}/ *' in line:
        new_lines.append('}\n')
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Cleaned styles.css")
