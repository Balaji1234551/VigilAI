import os, re

d = r'C:\Users\kurub\OneDrive\Desktop\Vigilai\frontend\src\screens'
files_fixed = []

for f in os.listdir(d):
    if not f.endswith('.js') or f in ['App.js', 'HomeScreen.js', 'CameraScreen.js', 'AlertsScreen.js', 'AnalyticsScreen.js', 'ProfileScreen.js']: 
        continue
    p = os.path.join(d, f)
    with open(p, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Remove the manual tab bar JSX
    new_content = re.sub(r'(\s*(?:\{\/\*.*?\*\/\}\s*)?<View style=\{styles\.tabBar\}>.*?</View>\s*)</SafeAreaView>', r'\n    </SafeAreaView>', content, flags=re.DOTALL)
    
    # Remove overflow: 'hidden' from containers where it breaks scrolling
    new_content = re.sub(r'(overflow:\s*[\'\"]hidden[\'\"],?\s*)', r'', new_content)
    
    if new_content != content:
        with open(p, 'w', encoding='utf-8') as file:
            file.write(new_content)
        files_fixed.append(f)

print('Fixed files:', files_fixed)
