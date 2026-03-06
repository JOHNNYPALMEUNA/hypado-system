import os

file_path = r"c:\Users\Promob\Downloads\Nova pasta\components\ObrasView.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# indices are 0-based
# Line 1103 (1-based) -> index 1102
# Line 1158 (1-based) -> index 1157
# We want to keep 0..1101 and 1158..end
# Line 1159 (1-based) -> index 1158

start_remove_idx = 1102
end_remove_idx = 1158 # This index will be the first one KEPT after the gap? 
# No, splice is [start:end].
# We want lines[:1102] + lines[1158:]

# Safety checks
line_before = lines[1101] # Line 1102
line_start_remove = lines[1102] # Line 1103
line_end_remove = lines[1157] # Line 1158
line_after = lines[1158] # Line 1159

print(f"Check 1102: {line_before.strip()}")
print(f"Check 1103: {line_start_remove.strip()}")
print(f"Check 1158: {line_end_remove.strip()}")
print(f"Check 1159: {line_after.strip()}")

if "</summary>" in line_before and "flex justify-end" in line_start_remove and "</div>" in line_end_remove and "grid grid-cols-1" in line_after:
    print("Verification passed at exact lines.")
    new_lines = lines[:1102] + lines[1158:] # removed 1102..1157
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("File updated successfully.")
else:
    print("Verification failed! Lines do not match expectation.")
    # Search for the lines dynamicallly
    found_start = -1
    found_end = -1
    for i, line in enumerate(lines):
        if "Importar Smart CUT" in line:
            # this is inside the block. 
            pass
            
    # Try to find the block start: <div className="flex justify-end pt-4 px-2">
    # Block end: </div> followed by <div className="grid grid-cols-1 md:grid-cols-3
    
    for i in range(len(lines)):
        if '<div className="flex justify-end pt-4 px-2">' in lines[i]:
            if '<Upload size={12} /> Importar Smart CUT' in lines[i+1] or '<Upload size={12} /> Importar Smart CUT' in "".join(lines[i:i+3]):
                found_start = i
                break
    
    if found_start != -1:
        # scan for end
        for i in range(found_start, len(lines)):
            if '</div>' in lines[i] and '<div className="grid grid-cols-1 md:grid-cols-3' in lines[i+1]:
                found_end = i
                break
    
    if found_start != -1 and found_end != -1:
        print(f"Found dynamic range: {found_start} to {found_end}")
        new_lines = lines[:found_start] + lines[found_end+1:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print("File updated successfully using dynamic search.")
    else:
        print("Could not find the block dynamically either.")
