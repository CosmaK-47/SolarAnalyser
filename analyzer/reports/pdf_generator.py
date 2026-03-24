"""
PDF Generator - Generare rapoarte profesionale
Format conform standardelor industriale
"""

import io
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
import base64

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, Frame, PageTemplate
)
from reportlab.pdfgen import canvas

import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')

from config import REPORT_CONFIG, MOLDOVA_CONFIG


class PDFReportGenerator:
    """
    Generator rapoarte PDF profesionale
    Conform standardelor IEC 61853 / EN 50583
    """

    def __init__(self, output_path: str):
        self.output_path = Path(output_path)
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        self.styles = self._create_styles()
        self.story = []

        print(f"📄 PDF Generator inițializat: {output_path}")

    def _create_styles(self):
        styles = getSampleStyleSheet()

        styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a5490'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))

        styles.add(ParagraphStyle(
            name='CustomHeading3',
            parent=styles['Heading3'],
            fontSize=13,
            textColor=colors.HexColor('#34495e'),
            spaceAfter=10,
            spaceBefore=10,
            fontName='Helvetica-Bold'
        ))

        styles.add(ParagraphStyle(
            name='CustomBody',
            parent=styles['BodyText'],
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=8
        ))

        styles.add(ParagraphStyle(
            name='Highlight',
            parent=styles['BodyText'],
            fontSize=11,
            textColor=colors.HexColor('#27ae60'),
            fontName='Helvetica-Bold',
            spaceAfter=6
        ))

        styles.add(ParagraphStyle(
            name='Warning',
            parent=styles['BodyText'],
            fontSize=10,
            textColor=colors.HexColor('#e74c3c'),
            leftIndent=20,
            spaceAfter=6
        ))

        return styles

    def generate_complete_report(
            self,
            analysis_results: Dict,
            p50_p90_results: Dict,
            shading_results: Dict,
            site_info: Dict
    ):
        print("\n📝 Generare raport PDF complet...")

        self._add_cover_page(site_info)
        self._add_executive_summary(analysis_results, p50_p90_results)
        self._add_site_information(site_info)
        self._add_solar_resource_analysis(analysis_results)
        self._add_system_performance(analysis_results)
        self._add_p50_p90_analysis(p50_p90_results)
        self._add_shading_analysis(shading_results)
        self._add_financial_projections(analysis_results, p50_p90_results)
        self._add_methodology_section(analysis_results)
        self._add_conclusions(analysis_results, p50_p90_results)

        self._build_pdf()

        print(f"✅ Raport generat: {self.output_path}")

    def _add_cover_page(self, site_info: Dict):
        if REPORT_CONFIG['logo_path'].exists():
            logo = Image(str(REPORT_CONFIG['logo_path']), width=4*cm, height=2*cm)
            logo.hAlign = 'CENTER'
            self.story.append(logo)
            self.story.append(Spacer(1, 20*mm))

        self.story.append(Paragraph("RAPORT POTENȚIAL SOLAR", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 5*mm))

        location_text = f"""
        <b>Locație:</b> {site_info.get('address', 'N/A')}<br/>
        <b>Coordonate:</b> {site_info['lat']:.6f}°N, {site_info['lon']:.6f}°E<br/>
        <b>Suprafață:</b> {site_info.get('area_ha', 'N/A')} ha
        """
        self.story.append(Paragraph(location_text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 15*mm))

        report_info = f"""
        <b>Data generare:</b> {datetime.now().strftime('%d.%m.%Y')}<br/>
        <b>Companie:</b> {REPORT_CONFIG['company_name']}<br/>
        <b>Certificare:</b> {REPORT_CONFIG['certification']}<br/>
        <b>Versiune:</b> 2.0
        """
        self.story.append(Paragraph(report_info, self.styles['CustomBody']))

        disclaimer = """
        <i>Acest raport se bazează pe date publice validate (PVGIS-5, NASA, Copernicus)
        și metodologii standard (IEC 61853, EN 50583).</i>
        """
        self.story.append(Spacer(1, 20*mm))
        self.story.append(Paragraph(disclaimer, self.styles['CustomBody']))

        self.story.append(PageBreak())

    def _add_executive_summary(self, analysis_results: Dict, p50_p90_results: Dict):
        self.story.append(Paragraph("1. REZUMAT EXECUTIV", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 5*mm))

        score = self._calculate_potential_score(analysis_results, p50_p90_results)

        score_text = f"""
        <b>SCOR POTENȚIAL SOLAR:</b>
        <font size=14 color='#27ae60'>{score:.1f}/10</font>
        """
        self.story.append(Paragraph(score_text, self.styles['Highlight']))
        self.story.append(Spacer(1, 3*mm))

        p50_production = p50_p90_results['p50'] / 1000
        p90_production = p50_p90_results['p90'] / 1000

        summary_data = [
            ['Indicator', 'Valoare'],
            ['Producție estimată (P50)', f"{p50_production:.1f} MWh/an"],
            ['Producție garantată (P90)', f"{p90_production:.1f} MWh/an"],
            ['Randament specific', f"{analysis_results['specific_yield_kwh_kwp']:.0f} kWh/kWp"],
            ['Performance Ratio', f"{analysis_results['performance_ratio']:.1%}"],
            ['Precizie estimare', analysis_results['accuracy_estimate']]
        ]

        table = Table(summary_data, colWidths=[8*cm, 7*cm])
        table.setStyle(self._get_table_style())
        self.story.append(table)
        self.story.append(Spacer(1, 5*mm))

        # RECOMANDARE
        if score >= 8:
            msg = "<font color='#27ae60'>✓ Locație EXCELENTĂ.</font>"
        elif score >= 6:
            msg = "<font color='#f39c12'>✓ Locație BUNĂ.</font>"
        else:
            msg = "<font color='#e74c3c'>⚠ Locația prezintă provocări.</font>"

        self.story.append(Paragraph(msg, self.styles['CustomBody']))
        self.story.append(PageBreak())

    def _add_site_information(self, site_info: Dict):
        self.story.append(Paragraph("2. INFORMAȚII LOCAȚIE", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 3*mm))

        site_data = [
            ['Parametru', 'Valoare'],
            ['Adresă', site_info.get('address', 'N/A')],
            ['Coordonate', f"{site_info['lat']:.6f}°N, {site_info['lon']:.6f}°E"],
            ['Elevație', f"{site_info.get('elevation', 'N/A')} m"],
            ['Suprafață', f"{site_info.get('area_ha', 'N/A')} ha"],
            ['Zona', site_info.get('zone', 'N/A')]
        ]

        table = Table(site_data, colWidths=[8*cm, 7*cm])
        table.setStyle(self._get_table_style())
        self.story.append(table)
        self.story.append(PageBreak())

    def _add_solar_resource_analysis(self, analysis_results: Dict):
        self.story.append(Paragraph("3. ANALIZĂ RESURSĂ SOLARĂ", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 3*mm))

        text = f"""
        Resursa solară este <b>{analysis_results['annual_irradiation_kwh_m2']:.0f} kWh/m²/an</b>,
        bazat pe PVGIS TMY. Moldova are o resursă solară <b>{"excelentă" if analysis_results['annual_irradiation_kwh_m2'] > 1400 else "bună"}</b>.
        """
        self.story.append(Paragraph(text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 3*mm))

        solar_data = [
            ['Parametru', 'Valoare', 'Comentariu'],
            ['Iradiere anuală', f"{analysis_results['annual_irradiation_kwh_m2']:.0f}", 'Pe plan orizontal'],
            ['Zile cu soare', analysis_results['sunny_days'], '>1 kWh/m²/zi'],
            ['Ore producție', f"{analysis_results['production_hours']:,}", 'GHI >50W/m²'],
            ['Ore peak sun', f"{analysis_results['peak_sun_hours']:,}", '>800W/m²']
        ]

        table = Table(solar_data, colWidths=[5*cm, 4*cm, 6*cm])
        table.setStyle(self._get_table_style())
        self.story.append(table)
        self.story.append(Spacer(1, 8*mm))

        chart = self._create_monthly_production_chart(
            analysis_results['monthly_production_kwh']
        )
        self.story.append(chart)
        self.story.append(PageBreak())

    def _add_system_performance(self, analysis_results: Dict):
        self.story.append(Paragraph("4. PERFORMANȚĂ SISTEM", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 3*mm))

        p = analysis_results['system_params']

        text = f"""
        • <b>Putere instalată:</b> {p['system_size_kw']} kWp<br/>
        • <b>Înclinare:</b> {p['surface_tilt']}°<br/>
        • <b>Orientare:</b> {p['surface_azimuth']}°<br/>
        • <b>Module:</b> {p['module_power']}W<br/>
        """
        self.story.append(Paragraph(text, self.styles['CustomBody']))

        perf = [
            ['Indicator', 'Valoare', 'Benchmark'],
            ['Performance Ratio', f"{analysis_results['performance_ratio']:.1%}", '75–85%'],
            ['Capacity Factor', f"{analysis_results['capacity_factor_pct']:.1f}%", '12–18%'],
            ['Pierderi totale', f"{analysis_results['system_losses']['total_loss_pct']:.1f}%", '10–18%']
        ]

        table = Table(perf, colWidths=[7*cm, 4*cm, 4*cm])
        table.setStyle(self._get_table_style())
        self.story.append(table)
        self.story.append(PageBreak())

    def _add_p50_p90_analysis(self, p50_p90_results: Dict):
        self.story.append(Paragraph("5. ANALIZĂ PROBABILISTICĂ P50/P90", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 3*mm))

        explanation = """
        Analiza P50/P90 estimează producția cu diverse probabilități:
        <br/><br/>
        • <b>P90</b> = producție garantată (90% probabilitate)<br/>
        • <b>P50</b> = producție mediană<br/>
        • <b>P10</b> = scenariu optimist<br/>
        """
        self.story.append(Paragraph(explanation, self.styles['CustomBody']))
        self.story.append(Spacer(1, 5*mm))

        pdata = [
            ['Percentilă', 'Producție (MWh/an)', 'vs P50'],
            ['P90', f"{p50_p90_results['p90']/1000:.1f}",
             f"{((p50_p90_results['p90']-p50_p90_results['p50'])/p50_p90_results['p50']*100):.1f}%"],
            ['P50', f"{p50_p90_results['p50']/1000:.1f}", "-"],
            ['Mean', f"{p50_p90_results['mean']/1000:.1f}",
             f"{((p50_p90_results['mean']-p50_p90_results['p50'])/p50_p90_results['p50']*100):+.1f}%"],
            ['P10', f"{p50_p90_results['p10']/1000:.1f}",
             f"{((p50_p90_results['p10']-p50_p90_results['p50'])/p50_p90_results['p50']*100):+.1f}%"]
        ]

        table = Table(pdata, colWidths=[5*cm, 5*cm, 4*cm])
        table.setStyle(self._get_table_style())
        self.story.append(table)
        self.story.append(Spacer(1, 5*mm))

        risk = ((p50_p90_results['p50'] - p50_p90_results['p90']) /
                p50_p90_results['p50'] * 100)

        risk_text = f"""
        <b>Risc proiect (P50-P90):</b> {risk:.1f}%
        """
        self.story.append(Paragraph(risk_text, self.styles['CustomBody']))
        self.story.append(PageBreak())

    def _add_shading_analysis(self, shading_results: Dict):
        self.story.append(Paragraph("6. ANALIZĂ UMBRIRE", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 3*mm))

        text = f"""
        Umbrirea provoacă o pierdere anuală de <b>{shading_results['annual_shading_loss_pct']:.1f}%</b>.
        """
        self.story.append(Paragraph(text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 5*mm))

        shading_data = [
            ['Parametru', 'Valoare'],
            ['Pierdere anuală', f"{shading_results['annual_shading_loss_pct']:.1f}%"],
            ['Ore complet umbrite', f"{shading_results['fully_shaded_hours']:,}"],
            ['Ore parțial umbrite', f"{shading_results['partially_shaded_hours']:,}"],
            ['Luna critică', f"{shading_results['worst_month']}"],
            ['Pierdere maximă lunară', f"{shading_results['worst_month_loss_pct']:.1f}%"]
        ]

        table = Table(shading_data, colWidths=[10*cm, 5*cm])
        table.setStyle(self._get_table_style())
        self.story.append(table)
        self.story.append(PageBreak())

    def _add_financial_projections(self, analysis_results: Dict, p50_p90_results: Dict):
        self.story.append(Paragraph("7. PROIECȚII FINANCIARE", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 3*mm))

        params = analysis_results['system_params']
        size = params['system_size_kw']
        capex_per_kw = 850
        total_capex = size * capex_per_kw
        tariff = 0.085

        p50 = p50_p90_results['p50']
        revenue = p50 * tariff
        payback = total_capex / revenue

        text = """
        Calcul financiar estimativ pentru condițiile Republicii Moldova 2024–2025.
        """
        self.story.append(Paragraph(text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 5*mm))

        financial_data = [
            ['Parametru', 'Valoare'],
            ['Dimensiune sistem', f"{size} kWp"],
            ['CAPEX', f"€{total_capex:,.0f}"],
            ['Cost/kWp', f"€{capex_per_kw}"],
            ['Producție P50', f"{p50/1000:.1f} MWh"],
            ['Tarif estimat', f"€{tariff:.3f}/kWh"],
            ['Venit anual', f"€{revenue:,.0f}"],
            ['Payback', f"{payback:.1f} ani"],
            ['ROI 25 ani', f"{((revenue*25/total_capex-1)*100):.0f}%"]
        ]

        table = Table(financial_data, colWidths=[10*cm, 5*cm])
        table.setStyle(self._get_table_style())
        self.story.append(table)
        self.story.append(Spacer(1, 5*mm))

        warning = """
        ⚠️ Aceste estimări nu reprezintă consultanță financiară.
        """
        self.story.append(Paragraph(warning, self.styles['Warning']))
        self.story.append(PageBreak())

    def _add_methodology_section(self, analysis_results: Dict):
        self.story.append(Paragraph("8. METODOLOGIE & PRECIZIE", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 3*mm))

        self.story.append(Paragraph(
            "Raport realizat cu metodologii conforme IEC 61853 / EN 50583.",
            self.styles['CustomBody']
        ))
        self.story.append(Spacer(1, 5*mm))

        sources = [
            ['Tip Date', 'Sursă', 'Rezoluție', 'Acuratețe'],
            ['Climă', 'PVGIS TMY', '3 km', '±4.2%'],
            ['Satelit', 'Sentinel-2', '10 m', '±0.5 m'],
            ['DEM', 'SRTM', '25 m', '±7 m'],
            ['Infrastructură', 'OSM', 'Variabilă', 'Validat local']
        ]

        table = Table(sources, colWidths=[4*cm, 4*cm, 3*cm, 3.5*cm])
        table.setStyle(self._get_table_style())
        self.story.append(table)
        self.story.append(Spacer(1, 5*mm))

        self.story.append(PageBreak())

    def _add_conclusions(self, analysis_results: Dict, p50_p90_results: Dict):
        self.story.append(Paragraph("9. CONCLUZII & RECOMANDĂRI", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 3*mm))

        score = self._calculate_potential_score(analysis_results, p50_p90_results)

        if score >= 8:
            text = "Locație EXCELENTĂ pentru parc solar."
        elif score >= 6:
            text = "Locație BUNĂ pentru investiție."
        else:
            text = "Locație problematică; recomandăm evaluări suplimentare."

        self.story.append(Paragraph(text, self.styles['CustomBody']))
        self.story.append(Spacer(1, 5*mm))

        self.story.append(Paragraph(
            "<b>Recomandări:</b>", self.styles['CustomSubtitle']
        ))

        self.story.append(Paragraph(
            "✓ Continuați cu proiectarea tehnică.",
            self.styles['CustomBody']
        ))

        self.story.append(Paragraph(
            "✓ Verificați costurile reale de racordare.",
            self.styles['CustomBody']
        ))

        self.story.append(Paragraph(
            "✓ Evaluați rentabilitatea economică.",
            self.styles['CustomBody']
        ))

        self.story.append(PageBreak())

    def _calculate_potential_score(self, analysis_results: Dict, p50_p90_results: Dict):
        score = 5.0

        sy = analysis_results['specific_yield_kwh_kwp']
        if sy > 1500: score += 2.5
        elif sy > 1400: score += 2.0
        elif sy > 1300: score += 1.5
        elif sy > 1200: score += 1.0

        pr = analysis_results['performance_ratio']
        if pr > 0.82: score += 1.5
        elif pr > 0.78: score += 1.0
        elif pr > 0.75: score += 0.5

        risk = ((p50_p90_results['p50'] - p50_p90_results['p90']) /
                p50_p90_results['p50'] * 100)
        if risk < 6: score += 1.0
        elif risk < 8: score += 0.7
        elif risk < 10: score += 0.4

        return min(score, 10.0)

    def _create_monthly_production_chart(self, monthly_data: Dict) -> Image:
        fig, ax = plt.subplots(figsize=(12, 5))

        months = list(monthly_data.keys())
        values = [monthly_data[m]/1000 for m in months]

        names = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun',
                 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']

        bars = ax.bar(range(len(months)), values, color='steelblue', edgecolor='black')

        for i in [5, 6, 7]:
            bars[i].set_color('#f39c12')

        ax.set_xlabel('Lună', fontsize=12)
        ax.set_ylabel('Producție (MWh)', fontsize=12)
        ax.set_title('Producție Lunară', fontsize=14, fontweight='bold')
        ax.set_xticks(range(len(months)))
        ax.set_xticklabels(names)
        ax.grid(axis='y', alpha=0.3)

        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        buf.seek(0)
        plt.close()

        img = Image(buf, width=15*cm, height=6*cm)
        return img

    def _get_table_style(self):
        return TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ])

    def _build_pdf(self):
        doc = SimpleDocTemplate(
            str(self.output_path),
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        doc.build(self.story, onFirstPage=self._add_page_number, onLaterPages=self._add_page_number)

    def _add_page_number(self, canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        page_num = canvas.getPageNumber()
        canvas.drawRightString(A4[0] - 2*cm, 1.5*cm, f"Pagina {page_num}")
        canvas.drawString(2*cm, 1.5*cm, REPORT_CONFIG['company_name'])
        canvas.restoreState()


def test_pdf_generator():
    print("🧪 Test PDF Generator\n")

    analysis_results = {
        'annual_production_kwh': 147500,
        'specific_yield_kwh_kwp': 1475,
        'performance_ratio': 0.81,
        'capacity_factor_pct': 16.8,
        'annual_irradiation_kwh_m2': 1380,
        'sunny_days': 267,
        'production_hours': 4380,
        'peak_sun_hours': 1200,
        'monthly_production_kwh': {i: 12000 + i*500 for i in range(1, 13)},
        'system_losses': {'total_loss_pct': 14.2},
        'system_params': {
            'system_size_kw': 100,
            'surface_tilt': 35,
            'surface_azimuth': 180,
            'module_power': 450,
            'modules_per_string': 25,
            'strings_parallel': 9
        },
        'accuracy_estimate': '±5% (P50)'
    }

    p50_p90_results = {
        'p10': 156100,
        'p50': 147500,
        'p90': 138200,
        'mean': 147800,
        'std': 9100
    }

    shading_results = {
        'annual_shading_loss_pct': 8.5,
        'fully_shaded_hours': 234,
        'partially_shaded_hours': 456,
        'worst_month': 12,
        'worst_month_loss_pct': 15.2
    }

    site_info = {
        'lat': 47.0105,
        'lon': 28.8638,
        'address': 'Chișinău, Moldova',
        'elevation': 85,
        'area_ha': 5.0,
        'zone': 'Urban'
    }

    generator = PDFReportGenerator('test_report.pdf')
    generator.generate_complete_report(
        analysis_results,
        p50_p90_results,
        shading_results,
        site_info
    )

    print("\n✅ Test PDF complet!")


if __name__ == '__main__':
    test_pdf_generator()
