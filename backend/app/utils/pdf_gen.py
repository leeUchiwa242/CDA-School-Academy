import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

# ==========================================
# Graphic charter: neutral / sober (no bright colors) — dark slate,
# grays and white only, close to the reference bulletin template.
# ==========================================
INK = (30, 34, 51)          # dark slate/navy used for header + table header
SLATE_900 = (15, 23, 42)
SLATE_700 = (51, 65, 85)
SLATE_600 = (71, 85, 105)
SLATE_400 = (148, 163, 184)
SLATE_200 = (226, 232, 240)
SLATE_100 = (241, 245, 249)
SLATE_50 = (248, 250, 252)
WHITE = (255, 255, 255)

PAGE_W = 210  # A4 portrait, mm
MARGIN = 15
CONTENT_W = PAGE_W - 2 * MARGIN

ESTABLISHMENT_NAME = "CDA - Académie scolaire"


def _ordinal_fr(n):
    """1 -> '1er', 2 -> '2e', 3 -> '3e', ..."""
    try:
        n = int(n)
    except (TypeError, ValueError):
        return str(n)
    return "1er" if n == 1 else f"{n}e"


def _fmt(value, suffix=""):
    return f"{value:.2f}{suffix}" if isinstance(value, (int, float)) else "-"


class BulletinPDF(FPDF):
    """
    Produces a sober, professional report card modeled after the school's
    reference template: centered title, Nom/Classe/Photo block, a grades
    table with per-subject class Min/Max/Moy, a "Vie scolaire" box
    (absences/retards + mention) and a class-council appreciation.
    """

    def header(self):
        self.set_fill_color(*INK)
        self.rect(0, 0, PAGE_W, 24, 'F')
        self.set_text_color(*WHITE)
        self.set_xy(0, 6)
        self.set_font('helvetica', 'B', 15)
        self.cell(PAGE_W, 7, f"BULLETIN DE NOTES - {self.term_label.upper()}", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_font('helvetica', '', 9.5)
        self.set_xy(0, 15)
        self.cell(PAGE_W, 5, f"Année scolaire : {self.year_label}", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_y(30)

    def footer(self):
        self.set_y(-16)
        self.set_draw_color(*SLATE_200)
        self.set_line_width(0.3)
        self.line(MARGIN, self.get_y(), PAGE_W - MARGIN, self.get_y())
        self.set_y(-13)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(*SLATE_400)
        self.cell(CONTENT_W / 2, 8, ESTABLISHMENT_NAME, align='L')
        self.cell(CONTENT_W / 2, 8, f"Page {self.page_no()}/{{nb}}", align='R')

    def section_title(self, text, color=SLATE_900):
        self.set_x(MARGIN)
        self.set_font('helvetica', 'B', 11)
        self.set_text_color(*color)
        self.cell(0, 7, text.upper(), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(*SLATE_400)
        self.set_line_width(0.6)
        y = self.get_y() + 0.5
        self.line(MARGIN, y, MARGIN + 26, y)
        self.ln(4)

    def rounded_card(self, x, y, w, h, fill_color=WHITE, border_color=SLATE_200, radius=3):
        self.set_fill_color(*fill_color)
        self.set_draw_color(*border_color)
        self.set_line_width(0.3)
        self.rect(x, y, w, h, style='DF', round_corners=True, corner_radius=radius)


def _wrapped_lines(pdf, w, text, font=('helvetica', '', 9)):
    pdf.set_font(*font)
    if not text:
        return ['-']
    lines = pdf.multi_cell(w, 5, text, dry_run=True, output="LINES")
    return lines or ['-']


def _table_row(pdf, x_positions, widths, values, font, text_color, fill=None, line_h=4.6, aligns=None):
    """Draws one wrapped, equal-height table row (never overlaps, never gets clipped)."""
    aligns = aligns or ['L'] * len(values)
    wrapped = [_wrapped_lines(pdf, widths[i] - 1.6, str(values[i]), font) for i in range(len(values))]
    n_lines = max(len(w) for w in wrapped)
    row_h = n_lines * line_h + 2

    if pdf.will_page_break(row_h):
        pdf.add_page()

    y0 = pdf.get_y()
    if fill:
        pdf.set_fill_color(*fill)
    pdf.set_draw_color(*SLATE_200)
    pdf.set_text_color(*text_color)
    pdf.set_font(*font)

    for i, text in enumerate(values):
        pdf.set_xy(x_positions[i], y0)
        pdf.multi_cell(
            widths[i], row_h / max(n_lines, 1), str(text) if text != '' else '-',
            border=1, align=aligns[i], fill=bool(fill),
            new_x=XPos.RIGHT, new_y=YPos.TOP, max_line_height=line_h
        )
    pdf.set_xy(MARGIN, y0 + row_h)
    return row_h


def _grades_table_header(pdf, leaf_x, leaf_w):
    """Two-level header: Matière | Évaluations{Devoirs,Examens} | Moy Élève | Classe{Min,Max,Moy} | Appréciations"""
    pdf.set_font('helvetica', 'B', 8)
    y0 = pdf.get_y()
    h1, h2 = 6, 6

    def tall(idx, label):
        pdf.set_fill_color(*INK)
        pdf.set_draw_color(*SLATE_200)
        pdf.rect(leaf_x[idx], y0, leaf_w[idx], h1 + h2, style='DF')
        pdf.set_text_color(*WHITE)
        pdf.set_xy(leaf_x[idx], y0 + (h1 + h2) / 2 - 3)
        pdf.multi_cell(leaf_w[idx], 3, label, align='C')

    def group(x, w, label):
        pdf.set_fill_color(*INK)
        pdf.set_draw_color(*SLATE_200)
        pdf.rect(x, y0, w, h1, style='DF')
        pdf.set_text_color(*WHITE)
        pdf.set_xy(x, y0 + 1)
        pdf.cell(w, h1 - 2, label, align='C')

    def sub(idx, label):
        pdf.set_fill_color(*INK)
        pdf.set_draw_color(*SLATE_200)
        pdf.rect(leaf_x[idx], y0 + h1, leaf_w[idx], h2, style='DF')
        pdf.set_text_color(*WHITE)
        pdf.set_xy(leaf_x[idx], y0 + h1 + 1)
        pdf.cell(leaf_w[idx], h2 - 2, label, align='C')

    tall(0, "Matière")
    group(leaf_x[1], leaf_w[1] + leaf_w[2], "Évaluations")
    sub(1, "Devoirs")
    sub(2, "Examens")
    tall(3, "Moy. Élève /100")
    group(leaf_x[4], leaf_w[4] + leaf_w[5] + leaf_w[6], "Classe")
    sub(4, "Min")
    sub(5, "Max")
    sub(6, "Moy")
    tall(7, "Appréciations")

    pdf.set_xy(MARGIN, y0 + h1 + h2)


def generate_bulletin_pdf(bulletin_data, output_path, upload_folder=None):
    """
    Generates a PDF from a bulletin data structure. The bulletin_data
    contract (student_info / grades / calculations / appreciation /
    ai_recommendation / vie_scolaire / term / academic_year) drives the
    rendering; the layout here follows the school's reference template.
    """
    pdf = BulletinPDF()
    pdf.term_label = bulletin_data['term']
    pdf.year_label = bulletin_data['academic_year']
    pdf.set_auto_page_break(auto=True, margin=22)
    pdf.alias_nb_pages()
    pdf.add_page()

    student_info = bulletin_data['student_info']
    calc = bulletin_data['calculations']
    vie_scolaire = bulletin_data.get('vie_scolaire', {'absences': 0, 'retards': 0})

    # ------------------------------------------------------------------
    # 1. Nom / Classe block (left) + photo (right)
    # ------------------------------------------------------------------
    block_y = pdf.get_y()
    photo_drawn = False
    photo_url = student_info.get('photo_url')
    if photo_url and upload_folder:
        filename = photo_url.split('/')[-1]
        photo_path = os.path.join(upload_folder, filename)
        if os.path.exists(photo_path):
            try:
                pdf.image(photo_path, x=PAGE_W - MARGIN - 24, y=block_y, w=24, h=24)
                photo_drawn = True
            except Exception:
                pass

    label_w = 32
    info_w = CONTENT_W - (28 if photo_drawn else 0) - label_w
    full_name = f"{student_info['first_name']} {student_info['last_name']}"
    rows = [("Nom :", full_name), ("Classe :", student_info.get('class_name') or '-')]
    pdf.set_xy(MARGIN, block_y)
    for label, value in rows:
        pdf.set_font('helvetica', 'B', 10)
        pdf.set_text_color(*SLATE_900)
        pdf.set_x(MARGIN)
        pdf.cell(label_w, 6.5, label)
        pdf.set_font('helvetica', '', 10)
        pdf.cell(info_w, 6.5, value, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_x(MARGIN)

    pdf.set_y(max(pdf.get_y(), block_y + (26 if photo_drawn else 0)) + 6)

    # ------------------------------------------------------------------
    # 2. Compact key-figures strip: Moyenne générale / Rang / Moyenne de classe
    # ------------------------------------------------------------------
    rank_str = f"{_ordinal_fr(calc['rank'])} sur {calc.get('class_size', 1)} élèves"
    strip_items = [
        ("Moyenne générale", f"{calc['average']:.2f} / 100"),
        ("Rang", rank_str),
        ("Moyenne de classe", f"{calc['class_average']:.2f} / 100"),
    ]
    gap = 5
    card_w = (CONTENT_W - gap * 2) / 3
    strip_h = 16
    if pdf.will_page_break(strip_h):
        pdf.add_page()
    strip_y = pdf.get_y()
    for i, (label, value) in enumerate(strip_items):
        cx = MARGIN + i * (card_w + gap)
        pdf.rounded_card(cx, strip_y, card_w, strip_h, fill_color=SLATE_50, border_color=SLATE_200)
        pdf.set_xy(cx + 5, strip_y + 2.5)
        pdf.set_font('helvetica', '', 7)
        pdf.set_text_color(*SLATE_600)
        pdf.cell(card_w - 8, 3.5, label.upper(), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_x(cx + 5)
        pdf.set_font('helvetica', 'B', 10.5)
        pdf.set_text_color(*SLATE_900)
        pdf.cell(card_w - 8, 6, str(value), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_y(strip_y + strip_h + 8)

    # ------------------------------------------------------------------
    # 3. Grades table (Matière / Évaluations / Moy. Élève / Classe Min-Max-Moy / Appréciations)
    # ------------------------------------------------------------------
    leaf_w = [26, 24, 20, 20, 14, 14, 14, CONTENT_W - (26 + 24 + 20 + 20 + 14 + 14 + 14)]
    leaf_x = [MARGIN]
    for w in leaf_w[:-1]:
        leaf_x.append(leaf_x[-1] + w)

    pdf.set_xy(MARGIN, pdf.get_y())
    _grades_table_header(pdf, leaf_x, leaf_w)

    zebra = False
    for g in bulletin_data['grades']:
        devoirs_str = ", ".join(f"{d:.0f}" for d in g['devoirs']) if g['devoirs'] else "-"
        examens_str = ", ".join(f"{e:.0f}" for e in g['examens']) if g['examens'] else "-"
        average_str = f"{g['average']:.2f}" if g['average'] is not None else "-"
        min_str = _fmt(g.get('class_min'))
        max_str = _fmt(g.get('class_max'))
        moy_str = _fmt(g.get('class_average'))
        appreciation = g.get('subject_appreciation', '-')

        row_fill = SLATE_50 if zebra else WHITE
        _table_row(
            pdf, leaf_x, leaf_w,
            [g['subject'], devoirs_str, examens_str, average_str, min_str, max_str, moy_str, appreciation],
            font=('helvetica', '', 8), text_color=SLATE_900, fill=row_fill,
            aligns=['L', 'C', 'C', 'C', 'C', 'C', 'C', 'L']
        )
        zebra = not zebra

    # "Moyenne générale" highlighted footer row, full width
    footer_h = 8
    if pdf.will_page_break(footer_h):
        pdf.add_page()
    fy = pdf.get_y()
    pdf.set_fill_color(*INK)
    pdf.rect(MARGIN, fy, CONTENT_W, footer_h, 'F')
    pdf.set_text_color(*WHITE)
    pdf.set_font('helvetica', 'B', 9.5)
    pdf.set_xy(MARGIN + 4, fy + 1.8)
    pdf.cell(CONTENT_W - 40, 5, "MOYENNE GÉNÉRALE", align='L')
    pdf.set_xy(MARGIN, fy + 1.8)
    pdf.cell(CONTENT_W - 4, 5, f"{calc['average']:.2f} / 100", align='R')
    pdf.set_y(fy + footer_h + 3)

    if not bulletin_data.get('has_grades', True):
        pdf.set_x(MARGIN)
        pdf.set_font('helvetica', 'I', 9)
        pdf.set_text_color(*SLATE_700)
        pdf.cell(0, 6, "Aucune note n'a été attribuée à cet élève pour ce trimestre.", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.ln(6)

    # ------------------------------------------------------------------
    # 4. Vie scolaire (absences / retards) + Mention
    # ------------------------------------------------------------------
    if pdf.will_page_break(20):
        pdf.add_page()
    pdf.section_title("Vie scolaire")
    vs_y = pdf.get_y()
    left_w = CONTENT_W * 0.62
    right_w = CONTENT_W - left_w
    row_h = 8

    pdf.set_font('helvetica', '', 9.5)
    pdf.set_text_color(*SLATE_900)
    for i, line in enumerate([f"Nombre d'absence(s) : {vie_scolaire.get('absences', 0)}",
                              f"Nombre de retard(s) : {vie_scolaire.get('retards', 0)}"]):
        pdf.set_xy(MARGIN, vs_y + i * row_h)
        pdf.set_draw_color(*SLATE_200)
        pdf.multi_cell(left_w, row_h, line, border=1, align='L', new_x=XPos.LMARGIN, new_y=YPos.TOP)

    pdf.set_xy(MARGIN + left_w, vs_y)
    pdf.rounded_card(MARGIN + left_w, vs_y, right_w, row_h * 2, fill_color=SLATE_50, border_color=SLATE_200, radius=0)
    pdf.set_font('helvetica', 'B', 8)
    pdf.set_text_color(*SLATE_600)
    pdf.set_xy(MARGIN + left_w, vs_y + 2)
    pdf.cell(right_w, 4, "MENTION", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_xy(MARGIN + left_w, vs_y + 8)
    pdf.set_font('helvetica', 'B', 12)
    pdf.set_text_color(*SLATE_900)
    pdf.cell(right_w, 6, calc['status_label'], align='C')

    pdf.set_y(vs_y + row_h * 2 + 8)

    # ------------------------------------------------------------------
    # 5. Global appreciation
    # ------------------------------------------------------------------
    appreciation = bulletin_data['appreciation'] or ''
    appr_lines = _wrapped_lines(pdf, CONTENT_W - 14, appreciation, ('helvetica', 'I', 10))
    appr_h = max(len(appr_lines), 1) * 5.6 + 10
    if pdf.will_page_break(appr_h + 10):
        pdf.add_page()

    pdf.section_title("Appréciation du conseil de classe")
    box_y = pdf.get_y()
    pdf.rounded_card(MARGIN, box_y, CONTENT_W, appr_h, fill_color=SLATE_50, border_color=SLATE_200)
    pdf.set_fill_color(*SLATE_400)
    pdf.rect(MARGIN, box_y, 2, appr_h, style='F', round_corners=('TOP_LEFT', 'BOTTOM_LEFT'), corner_radius=2)
    pdf.set_xy(MARGIN + 6, box_y + 5)
    pdf.set_font('helvetica', 'I', 10)
    pdf.set_text_color(*SLATE_900)
    pdf.multi_cell(CONTENT_W - 12, 5.6, appreciation, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_y(box_y + appr_h + 8)

    # ------------------------------------------------------------------
    # 6. Personalized orientation advice (optional block)
    # ------------------------------------------------------------------
    ai_reco = bulletin_data.get('ai_recommendation', {}).get('recommendation') if bulletin_data.get('ai_recommendation') else None
    if ai_reco:
        closing_note = (
            "Nous invitons l'élève à se rapprocher du conseil pédagogique de l'établissement "
            "pour échanger sur ces pistes et obtenir des réponses à toutes ses questions sur "
            "les filières possibles et les métiers correspondants."
        )
        full_text = f"{ai_reco}\n\n{closing_note}"

        ai_lines = _wrapped_lines(pdf, CONTENT_W - 14, full_text, ('helvetica', '', 9.5))
        ai_h = max(len(ai_lines), 1) * 5.2 + 10
        if pdf.will_page_break(ai_h + 10):
            pdf.add_page()

        pdf.section_title("Conseil d'orientation personnalisé")
        box_y = pdf.get_y()
        pdf.rounded_card(MARGIN, box_y, CONTENT_W, ai_h, fill_color=SLATE_50, border_color=SLATE_200)
        pdf.set_fill_color(*SLATE_400)
        pdf.rect(MARGIN, box_y, 2, ai_h, style='F', round_corners=('TOP_LEFT', 'BOTTOM_LEFT'), corner_radius=2)
        pdf.set_xy(MARGIN + 6, box_y + 5)
        pdf.set_font('helvetica', '', 9.5)
        pdf.set_text_color(*SLATE_900)
        pdf.multi_cell(CONTENT_W - 12, 5.2, full_text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_y(box_y + ai_h + 10)

    # ------------------------------------------------------------------
    # 7. Signature
    # ------------------------------------------------------------------
    if pdf.will_page_break(24):
        pdf.add_page()
    pdf.section_title("Signature du chef d'établissement")
    line_y = pdf.get_y() + 14
    pdf.set_draw_color(*SLATE_400)
    pdf.set_line_width(0.2)
    pdf.line(PAGE_W - MARGIN - 70, line_y, PAGE_W - MARGIN, line_y)
    pdf.set_xy(PAGE_W - MARGIN - 70, line_y + 2)
    pdf.set_font('helvetica', 'B', 9)
    pdf.set_text_color(*SLATE_600)
    pdf.cell(70, 5, "Le chef d'établissement", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.output(output_path)
