import re

with open('src/app/(dashboard)/dashboard/page.tsx', 'r') as f:
    content = f.read()

# Replace specific white transluscent values with variables
content = re.sub(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.03\s*\)', 'var(--glass-bg)', content)
content = re.sub(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.0[456]\s*\)', 'var(--glass-bg)', content)
content = re.sub(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.07\s*\)', 'var(--glass-border)', content)
content = re.sub(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.08\s*\)', 'var(--glass-border)', content)
content = re.sub(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.1[0-9]?\s*\)', 'var(--glass-border)', content)

# Check if there are any hardcoded dark background colors in page.tsx
content = content.replace('background: #060b1a;', 'background: var(--background);')

with open('src/app/(dashboard)/dashboard/page.tsx', 'w') as f:
    f.write(content)
print("Done dashboard")
