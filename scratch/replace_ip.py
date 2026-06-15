import os

path = r"c:\Users\kurub\OneDrive\Desktop\Vigilai\vigilai\src"
old_ip = "192.168.134.1"
new_ip = "10.241.125.80"

count = 0
for root, dirs, files in os.walk(path):
    for file in files:
        if file.endswith(".js"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            if old_ip in content:
                new_content = content.replace(old_ip, new_ip)
                with open(filepath, "w", encoding="utf-8", newline="") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
                count += 1
                
print(f"Done. Updated {count} files.")
