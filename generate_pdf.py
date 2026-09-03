from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'POTHOLE WALA - SIH PRESENTATION', 0, 1, 'C')

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

pdf = PDF()
pdf.add_page()
pdf.set_font('Arial', '', 12)

with open('PRESENTATION_CONTENT.md', 'r', encoding='utf-8') as f:
    text = f.read()
    # Strip troublesome unicode chars for FPDF
    text = text.replace('**', '').replace('__', '')
    text = text.replace('—', '-').replace('→', '->').replace('↓', 'v')
    pdf.multi_cell(0, 10, text)

pdf.output('POTHOLE_WALA_SIH_FINAL.pdf', 'F')
print('Successfully saved POTHOLE_WALA_SIH_FINAL.pdf')
