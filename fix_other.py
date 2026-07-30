import re

# Fix dashboard/page.tsx
with open('src/app/(dashboard)/dashboard/page.tsx', 'r') as f:
    content = f.read()

# For pf-tab-count and db-perf-tab-badge, replace rgba(255,255,255,X) with var(--muted-foreground) but only if not active...
# Actually, an easier way is to just use var(--border) or var(--glass-border) which adapts.
content = content.replace('background: rgba(255,255,255,0.2);', 'background: var(--glass-border-strong);')
content = content.replace('background: rgba(255,255,255,0.25);', 'background: var(--glass-border-strong);')
content = content.replace('background: rgba(255,255,255,0.3);', 'background: var(--glass-border-strong);')

with open('src/app/(dashboard)/dashboard/page.tsx', 'w') as f:
    f.write(content)

# Fix exams/page.tsx
with open('src/app/(dashboard)/exams/page.tsx', 'r') as f:
    content = f.read()

content = content.replace('background: \'rgba(255,255,255,0.02)\'', 'background: \'var(--glass-bg)\'')
content = content.replace('background: \'rgba(255,255,255,0.03)\'', 'background: \'var(--glass-bg)\'')

with open('src/app/(dashboard)/exams/page.tsx', 'w') as f:
    f.write(content)

print("Done other")
