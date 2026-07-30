import re

with open('src/app/globals.css', 'r') as f:
    lines = f.readlines()

new_lines = []
in_auth_section = False

for i, line in enumerate(lines):
    if "LOGIN PAGE V2" in line:
        in_auth_section = True
    
    if in_auth_section:
        # Backgrounds
        line = line.replace('background: #060b1a;', 'background: var(--background);')
        line = line.replace('color: #f8fafc;', 'color: var(--foreground);')
        
        # Transparent whites -> standard borders/cards
        line = line.replace('background: rgba(255, 255, 255, 0.04);', 'background: var(--card);')
        line = line.replace('background: rgba(255, 255, 255, 0.05);', 'background: var(--card);')
        line = line.replace('background: rgba(255,255,255,0.05);', 'background: var(--card);')
        line = line.replace('background: rgba(255,255,255,0.04);', 'background: var(--card);')
        
        line = line.replace('border: 1px solid rgba(255, 255, 255, 0.1);', 'border: 1px solid var(--border);')
        line = line.replace('border: 1px solid rgba(255,255,255,0.1);', 'border: 1px solid var(--border);')
        
        line = line.replace('border-bottom: 1px solid rgba(255, 255, 255, 0.07);', 'border-bottom: 1px solid var(--sidebar-border);')
        
        line = line.replace('background: rgba(6, 11, 26, 0.8);', 'background: var(--sidebar-bg);')
        line = line.replace('background: rgba(6, 11, 26, 0.85);', 'background: var(--sidebar-bg);')
        
        # Text colors
        line = line.replace('color: #cbd5e1;', 'color: var(--foreground);')
        line = line.replace('color: #94a3b8;', 'color: var(--muted-foreground);')
        line = line.replace('color: #64748b;', 'color: var(--muted-foreground);')
        line = line.replace('color: #334155;', 'color: var(--muted-foreground);')
        line = line.replace('color: #475569;', 'color: var(--muted-foreground);')
        
        # Mini avatar border
        line = line.replace('border: 2px solid #060b1a;', 'border: 2px solid var(--background);')

        # Nav ghost button
        line = line.replace('border: 1px solid rgba(255, 255, 255, 0.1);', 'border: 1px solid var(--border);')
        line = line.replace('background: rgba(255, 255, 255, 0.07);', 'background: var(--muted);')
        line = line.replace('background: rgba(255, 255, 255, 0.04);', 'background: var(--muted);')
        line = line.replace('background: rgba(255, 255, 255, 0.03);', 'background: var(--muted);')
        line = line.replace('background: rgba(255,255,255,0.04);', 'background: var(--muted);')
        
        # Divider lines
        line = line.replace('background: rgba(255, 255, 255, 0.07);', 'background: var(--border);')
        line = line.replace('background: rgba(255, 255, 255, 0.08);', 'background: var(--border);')
        line = line.replace('background: rgba(255,255,255,0.08);', 'background: var(--border);')
        
        # Dots
        line = line.replace('background: rgba(255, 255, 255, 0.2);', 'background: var(--muted-foreground);')
        
    new_lines.append(line)

with open('src/app/globals.css', 'w') as f:
    f.writelines(new_lines)
