import re
import json

lines = open('siglario_extract.txt', 'r', encoding='utf-8').read().splitlines()

allowed = []
forbidden = []
mode = 'allowed'

for i, line in enumerate(lines):
    line = line.strip()
    if not line: continue
    if 'Abreviatura, Siglas, Símbolos que não devem ser utilizados' in line or 'Abreviatura s e Siglas' in line:
        mode = 'forbidden'
        continue
    
    if mode == 'allowed':
        # the structure is "Sigla Significado"
        # usually 1 or two "words" for sigla, then space, then meaning.
        # "A + I Audiometria tonal / vocal + imitânciometria"
        # Since it's messy, let's just grab the first word separated by space if it's uppercase
        parts = line.split(" ", 1)
        if len(parts) == 2:
            sigla = parts[0]
            # some siglas have spaces like "A + I" or "A/C" we have to be careful
            # we just take the first continuous non space string
            if sigla.isupper() or len(sigla) >= 1:
                if sigla not in ['Sigla', 'MANUAL', 'SIGLAS', 'ATUALIZAÇÃO']:
                    allowed.append(sigla)
    elif mode == 'forbidden':
        parts = line.split(" ", 1)
        if len(parts) == 2:
            sigla = parts[0]
            # avoid headers
            if sigla and len(sigla) >= 1 and sigla not in ['Pretendido', 'Para', 'Este']:
                forbidden.append(sigla)

res = {
    'allowed': list(set([a for a in allowed if len(a) > 0])),
    'forbidden': list(set([f for f in forbidden if len(f) > 0]))
}
open('siglario.json', 'w', encoding='utf-8').write(json.dumps(res, indent=2))
print(f"Parsed {len(res['allowed'])} allowed and {len(res['forbidden'])} forbidden.")
