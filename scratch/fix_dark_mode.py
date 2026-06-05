import os

file_path = "src/app/configuracoes/consultas/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    "bg-white": "bg-zinc-950",
    "bg-slate-50": "bg-zinc-900",
    "bg-slate-100": "bg-zinc-800",
    "text-slate-900": "text-white",
    "text-slate-800": "text-zinc-200",
    "text-slate-600": "text-zinc-300",
    "text-slate-500": "text-zinc-400",
    "text-slate-400": "text-zinc-500",
    "border-slate-200": "border-zinc-800",
    "border-slate-100": "border-zinc-800",
    "rounded-[var(--radius)]": "rounded-none",
    "shadow-sm": "shadow-none",
    "shadow-md": "shadow-none",
    "shadow-lg": "shadow-none",
    "shadow-2xl": "shadow-none",
    "rounded-full": "rounded-none",
    "shadow-inner": "shadow-none"
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Dark mode replaced successfully!")
