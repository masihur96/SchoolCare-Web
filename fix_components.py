import os
import glob

# Replace rgba(0,0,0,0.015) and rgba(0,0,0,0.02) in src/components/
for filepath in glob.glob('src/components/**/*.tsx', recursive=True):
    with open(filepath, 'r') as f:
        content = f.read()
        
    original = content
    content = content.replace("background: 'rgba(0,0,0,0.015)'", "background: 'var(--glass-bg)'")
    content = content.replace("background: 'rgba(0,0,0,0.02)'", "background: 'var(--glass-bg)'")
    content = content.replace("background: 'rgba(0, 0, 0, 0.015)'", "background: 'var(--glass-bg)'")
    content = content.replace("background: 'rgba(0, 0, 0, 0.02)'", "background: 'var(--glass-bg)'")
    
    # Check specifically for navbar.tsx
    if 'navbar.tsx' in filepath:
        content = content.replace('border: 1px solid rgba(255,255,255,0.1);', 'border: 1px solid var(--glass-border);')
        content = content.replace('border: 1px solid rgba(255,255,255,0.12);', 'border: 1px solid var(--glass-border);')
        
    if original != content:
        with open(filepath, 'w') as f:
            f.write(content)

print("Done components")
