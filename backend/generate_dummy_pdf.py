import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

def generate_pdf():
    file_path = os.path.join(os.path.dirname(__file__), "Nota_Fiscal_Exemplo.pdf")
    c = canvas.Canvas(file_path, pagesize=A4)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(200, 800, "NOTA FISCAL DE SERVICOS / PRODUTOS")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, 750, "Numero: 999888")
    c.drawString(50, 730, "Serie: 1")
    c.drawString(50, 710, "Fornecedor: Super Tech LTDA")
    c.drawString(50, 690, "Contrato Associado: CT-999/2026")
    c.drawString(50, 670, "Data de Emissao: 13/08/2026")
    
    c.line(50, 650, 550, 650)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 630, "ITENS DA NOTA")
    
    c.setFont("Helvetica", 10)
    c.drawString(50, 610, "1. Monitor 24 Polegadas - Qtd: 2 UN - Vl Unit: R$ 1000,00 - Vl Total: R$ 2000,00")
    
    c.line(50, 590, 550, 590)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(350, 560, "VALOR TOTAL: R$ 2000,00")
    
    c.save()
    print(f"PDF gerado com sucesso em: {file_path}")

if __name__ == "__main__":
    generate_pdf()
