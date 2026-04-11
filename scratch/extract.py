import PyPDF2
pdf_file = open(r'C:\Users\wellington.guedes\Documents\Antigravity\DashBoard_Documentos\SQL\siglario_nov.2025.pdf', 'rb')
reader = PyPDF2.PdfReader(pdf_file)
text = ''
for page in reader.pages:
    text += page.extract_text() + '\n'
open(r'C:\Users\wellington.guedes\Documents\Antigravity\DashBoard_Documentos\scratch\siglario_extract.txt', 'w', encoding='utf-8').write(text)
print("Extract OK")
