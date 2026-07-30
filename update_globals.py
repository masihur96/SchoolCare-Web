import re
import sys

def main():
    try:
        with open('src/app/globals.css', 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print("globals.css not found.")
        return

    # 1. Add glass variables to :root
    if '--glass-bg' not in content:
        root_repl = """  --sidebar-border: rgba(255, 255, 255, 0.4);
  --glass-bg: rgba(0, 0, 0, 0.03);
  --glass-border: rgba(0, 0, 0, 0.08);
  --glass-border-strong: rgba(0, 0, 0, 0.15);
}"""
        content = content.replace("  --sidebar-border: rgba(255, 255, 255, 0.4);\n}", root_repl)
        
        dark_repl = """  --sidebar-border: rgba(255, 255, 255, 0.1);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-border-strong: rgba(255, 255, 255, 0.2);
}"""
        content = content.replace("  --sidebar-border: rgba(255, 255, 255, 0.1);\n}", dark_repl)

    # 2. Update .glass-card
    content = content.replace("background: rgba(255, 255, 255, 0.05);", "background: var(--glass-bg);")
    # Note: we will rely on regex for some replacements
    
    # Let's replace auth-specific hardcoded colors with css variables
    # We only want to replace within specific sections or globally if safe.
    # Actually, almost all rgba(255,255,255, X) for backgrounds and borders can use glass variables.
    
    # We will carefully replace the specific known hex colors globally in the file (mostly used in auth/dashboard)
    replacements = [
        # Backgrounds and primary text
        (r'background:\s*#060b1a;', 'background: var(--background);'),
        (r'color:\s*#f8fafc;', 'color: var(--foreground);'),
        
        # Muted text
        (r'color:\s*#cbd5e1;', 'color: var(--foreground);'), # light grey -> foreground
        (r'color:\s*#94a3b8;', 'color: var(--muted-foreground);'),
        (r'color:\s*#64748b;', 'color: var(--muted-foreground);'),
        (r'color:\s*#334155;', 'color: var(--muted-foreground);'),
        (r'color:\s*#475569;', 'color: var(--muted-foreground);'),
        
        # Transparent whites for cards and backgrounds
        (r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.0[345678]\);', 'background: var(--glass-bg);'),
        (r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.1[0-9]?\);', 'background: var(--glass-bg);'),
        
        # Borders
        (r'border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-1][0-9]?\);', 'border: 1px solid var(--glass-border);'),
        (r'border-bottom:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-1][0-9]?\);', 'border-bottom: 1px solid var(--glass-border);'),
        (r'border-top:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-1][0-9]?\);', 'border-top: 1px solid var(--glass-border);'),
        (r'border:\s*2px solid rgba\(255,\s*255,\s*255,\s*0\.[0-1][0-9]?\);', 'border: 2px solid var(--glass-border);'),
        
        # Box shadow rings
        (r'box-shadow:\s*0 0 0 1px rgba\(255,255,255,0\.0[0-9]\)', 'box-shadow: 0 0 0 1px var(--glass-border)'),
        
        # Specific opaque colors
        (r'border:\s*2px solid #060b1a;', 'border: 2px solid var(--background);'),
        (r'background:\s*rgba\(6,\s*11,\s*26,\s*0\.[89][5]?\);', 'background: var(--background);'), # the nav bar
        
        # Background dots/lines
        (r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.2\);', 'background: var(--muted-foreground);'),
    ]

    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)

    # Some fixes for text gradients or backgrounds that shouldn't have changed, but they are fine.
    
    with open('src/app/globals.css', 'w') as f:
        f.write(content)

    print("Success")

if __name__ == '__main__':
    main()
