"""
Inspector KPI report — compares each inspector's actual output for a quarter
against their quarterly targets (who is meeting KPIs and who isn't), plus a
"late entry" section listing inspections captured after the date they were done.

Generates a PDF (reportlab) that can be downloaded or emailed via the app's
configured email backend (Microsoft Graph on the live server).
"""
import datetime
import io

from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q, F

from ..models import FoodSafetyAgencyInspection, QuarterlyTarget, Notification
from ..decorators import role_required


def _cors(response):
    """Permissive CORS for the Next.js proxy (server-to-server, localhost dev)."""
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response


# Commodity fields on QuarterlyTarget → commodity value on inspections
COMMODITY_MAP = [
    ("eggs", "EGGS"),
    ("poultry", "POULTRY"),
    ("raw", "RAW"),
    ("pmp", "PMP"),
]


def current_quarter(today=None):
    today = today or datetime.date.today()
    return today.year, (today.month - 1) // 3 + 1


def quarter_date_range(year, quarter):
    start_month = (quarter - 1) * 3 + 1
    start = datetime.date(year, start_month, 1)
    if start_month + 3 > 12:
        end = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        end = datetime.date(year, start_month + 3, 1) - datetime.timedelta(days=1)
    return start, end


def build_kpi_report_data(year, quarter):
    """Return a dict with per-inspector KPI status and the late-entry list."""
    start, end = quarter_date_range(year, quarter)

    targets = QuarterlyTarget.objects.filter(year=year, quarter=quarter).order_by("inspector_name")

    inspectors = []
    meeting_count = 0
    for t in targets:
        insp_qs = FoodSafetyAgencyInspection.objects.filter(
            inspector_name=t.inspector_name,
            date_of_inspection__gte=start,
            date_of_inspection__lte=end,
        ).exclude(Q(is_occurrence_report=True))

        per_commodity = []
        target_total = 0
        actual_total = 0
        for field, commodity in COMMODITY_MAP:
            tgt = getattr(t, field, 0) or 0
            act = insp_qs.filter(commodity=commodity).count()
            target_total += tgt
            actual_total += act
            per_commodity.append({"commodity": commodity, "target": tgt, "actual": act})

        samples_target = t.total_samples or 0
        samples_actual = insp_qs.filter(is_sample_taken=True).count()

        is_meeting = actual_total >= target_total and (samples_target == 0 or samples_actual >= samples_target)
        if is_meeting:
            meeting_count += 1

        pct = round((actual_total / target_total) * 100) if target_total else None
        inspectors.append({
            "inspector_name": t.inspector_name,
            "per_commodity": per_commodity,
            "target_total": target_total,
            "actual_total": actual_total,
            "samples_target": samples_target,
            "samples_actual": samples_actual,
            "pct": pct,
            "is_meeting": is_meeting,
        })

    # ── Late entries: captured outside the allowed lag window (see late_capture_report) ──
    from .late_capture_report import LATE_CAPTURE_LAG_DAYS
    late_qs = (
        FoodSafetyAgencyInspection.objects
        .filter(created_at__date__gt=F("date_of_inspection") + datetime.timedelta(days=LATE_CAPTURE_LAG_DAYS))
        .filter(date_of_inspection__gte=start, date_of_inspection__lte=end)
        .order_by("-created_at")
    )
    # Summarise late entries per inspector (who has late entries, how many, how late)
    late_by_inspector = {}
    for name, created, doi in late_qs.values_list("inspector_name", "created_at", "date_of_inspection"):
        if created is None or doi is None:
            continue
        dl = (created.date() - doi).days
        e = late_by_inspector.setdefault(name or "—", {"count": 0, "total": 0, "max": 0})
        e["count"] += 1
        e["total"] += dl
        e["max"] = max(e["max"], dl)
    late_summary = sorted(
        [{"inspector_name": k, "count": v["count"],
          "avg_days": round(v["total"] / v["count"], 1), "max_days": v["max"]}
         for k, v in late_by_inspector.items()],
        key=lambda x: (-x["count"], x["inspector_name"]))

    # ── Missing RFI: RAW/PMP inspection groups with no RFI document ──
    # Every RAW/PMP inspection sits in a group that should have an RFI assigned.
    from ..models import InspectionGroup, InspectionDocument
    rawpmp_group_ids = list(
        FoodSafetyAgencyInspection.objects
        .filter(date_of_inspection__gte=start, date_of_inspection__lte=end,
                commodity__in=["RAW", "PMP"], inspection_group__isnull=False)
        .values_list("inspection_group_id", flat=True).distinct()
    )
    rfi_group_ids = set(
        InspectionDocument.objects
        .filter(document_type="rfi", inspection__inspection_group_id__in=rawpmp_group_ids)
        .values_list("inspection__inspection_group_id", flat=True)
    )
    missing_rfi_ids = [gid for gid in rawpmp_group_ids if gid not in rfi_group_ids]
    missing_rfi = []
    for g in InspectionGroup.objects.filter(id__in=missing_rfi_ids).order_by("-date_of_inspection")[:200]:
        commodities = ", ".join(sorted(set(
            FoodSafetyAgencyInspection.objects
            .filter(inspection_group=g, commodity__in=["RAW", "PMP"])
            .values_list("commodity", flat=True))))
        missing_rfi.append({
            "inspector_name": g.inspector_name or "—",
            "client_name": g.client_name or "—",
            "date": g.date_of_inspection.strftime("%d %b %Y") if g.date_of_inspection else "—",
            "commodities": commodities or "—",
        })

    # ── Missing travel details: groups missing km / hours / start / end time ──
    travel_qs = InspectionGroup.objects.filter(
        date_of_inspection__gte=start, date_of_inspection__lte=end,
    ).filter(
        Q(km_traveled__isnull=True) | Q(km_traveled=0) |
        Q(hours__isnull=True) | Q(hours=0) |
        Q(travel_start_time__isnull=True) | Q(travel_end_time__isnull=True)
    ).order_by("-date_of_inspection")
    missing_travel_count = travel_qs.count()
    missing_travel = []
    for g in travel_qs[:200]:
        gaps = []
        if not g.km_traveled or g.km_traveled == 0:
            gaps.append("KM")
        if not g.hours or g.hours == 0:
            gaps.append("Hours")
        if not g.travel_start_time:
            gaps.append("Start time")
        if not g.travel_end_time:
            gaps.append("End time")
        missing_travel.append({
            "inspector_name": g.inspector_name or "—",
            "client_name": g.client_name or "—",
            "date": g.date_of_inspection.strftime("%d %b %Y") if g.date_of_inspection else "—",
            "missing": ", ".join(gaps),
        })

    # Per-inspector summary of missing travel details (counts every affected visit)
    missing_travel_by_inspector = {}
    for _name in travel_qs.values_list("inspector_name", flat=True):
        _k = _name or "—"
        missing_travel_by_inspector[_k] = missing_travel_by_inspector.get(_k, 0) + 1
    missing_travel_summary = sorted(
        [{"inspector_name": k, "count": v} for k, v in missing_travel_by_inspector.items()],
        key=lambda x: (-x["count"], x["inspector_name"]))

    # ── Duplicate inspections by inspector ──
    # A "duplicate" is the same inspection captured more than once for the same
    # client + date + inspector with an IDENTICAL product signature (commodity +
    # product). Same detection as the Inspections list "View Duplicates" badge.
    from collections import defaultdict
    dup_triples = list(
        InspectionGroup.objects
        .filter(date_of_inspection__gte=start, date_of_inspection__lte=end)
        .values("client_name", "date_of_inspection", "inspector_name")
        .annotate(_gc=Count("id")).filter(_gc__gt=1)
        .values_list("client_name", "date_of_inspection", "inspector_name")
    )
    dup_group_ids = set()
    dup_by_inspector = {}
    if dup_triples:
        combo_q = Q()
        for dc, dd, di in dup_triples:
            combo_q |= Q(client_name=dc, date_of_inspection=dd, inspector_name=di)
        candidate_groups = list(InspectionGroup.objects.filter(combo_q).prefetch_related("inspections"))
        combo_map = defaultdict(list)
        for cg in candidate_groups:
            products = tuple(sorted((i.commodity or "", i.product_name or "") for i in cg.inspections.all()))
            combo_map[(cg.client_name, cg.date_of_inspection, cg.inspector_name)].append((products, cg))
        for _combo_key, entries in combo_map.items():
            sig_map = defaultdict(list)
            for sig, cg in entries:
                sig_map[sig].append(cg)
            for sig, cgs in sig_map.items():
                if len(cgs) > 1:
                    name = cgs[0].inspector_name or "—"
                    e = dup_by_inspector.setdefault(name, {"sets": 0, "extras": 0, "clients": set()})
                    e["sets"] += 1                      # one duplicated inspection
                    e["extras"] += len(cgs) - 1         # number of redundant copies
                    e["clients"].add(cgs[0].client_name or "—")
                    for cg in cgs:
                        dup_group_ids.add(cg.id)
    duplicate_summary = sorted(
        [{"inspector_name": k, "dup_sets": v["sets"], "extra_copies": v["extras"],
          "clients": len(v["clients"])} for k, v in dup_by_inspector.items()],
        key=lambda x: (-x["extra_copies"], x["inspector_name"]))

    # ── Clean record: inspectors with no lab-reported sample issues ──
    sample_discrepancies = _open_sample_discrepancies()
    flagged_names = {
        (d["inspector_name"] or "").strip().lower()
        for d in sample_discrepancies if (d["inspector_name"] or "").strip() and d["inspector_name"] != "—"
    }
    clean_inspectors = [
        insp["inspector_name"] for insp in inspectors
        if insp["inspector_name"].strip().lower() not in flagged_names
    ]

    return {
        "year": year,
        "quarter": quarter,
        "period_label": f"Q{quarter} {year}",
        "range_label": f"{start.strftime('%d %b')} – {end.strftime('%d %b %Y')}",
        "inspectors": inspectors,
        "total_inspectors": len(inspectors),
        "meeting_count": meeting_count,
        "not_meeting_count": len(inspectors) - meeting_count,
        "late_summary": late_summary,
        "late_count": late_qs.count(),
        "missing_rfi": missing_rfi,
        "missing_rfi_count": len(missing_rfi_ids),
        "missing_travel": missing_travel,
        "missing_travel_count": missing_travel_count,
        "missing_travel_summary": missing_travel_summary,
        "sample_discrepancies": sample_discrepancies,
        "clean_inspectors": clean_inspectors,
        "duplicate_summary": duplicate_summary,
        "duplicate_group_count": len(dup_group_ids),
    }


def _open_sample_discrepancies():
    """Open (not-yet-rectified) lab-reported sample discrepancies for the report."""
    from ..models import SampleDiscrepancy
    out = []
    for d in SampleDiscrepancy.objects.filter(rectified=False).order_by("-created_at")[:200]:
        out.append({
            "inspector_name": d.inspector_name or "—",
            "client_name": d.client_name or "",
            "date": d.date_of_inspection.strftime("%d %b %Y") if d.date_of_inspection else "",
            "note": d.note or "",
            "reported_by": (d.reported_by.get_full_name() or d.reported_by.username) if d.reported_by else "",
        })
    return out


def generate_kpi_pdf(data):
    """Render the KPI report to a branded PDF (matches the Lab Analytics report)."""
    import os
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable,
    )

    TEAL = colors.HexColor("#007890")
    GREEN = colors.HexColor("#059669")
    RED = colors.HexColor("#dc2626")
    AMBER = colors.HexColor("#f59e0b")
    DARK = colors.HexColor("#0f172a")
    GREY = colors.HexColor("#6b7280")
    GREY_LIGHT = colors.HexColor("#9ca3af")
    HAIR = colors.HexColor("#e5e7eb")
    ROW_ALT = colors.HexColor("#f8fafc")

    PAGE = landscape(A4)
    W, H = PAGE
    now = datetime.datetime.now()
    logo_path = os.path.join(str(settings.BASE_DIR), "frontend", "public", "logo.png")

    # ── Cover page (page 1) drawn directly on the canvas ──
    def _cover(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(DARK)
        canvas.rect(0, 0, W, H, fill=1, stroke=0)
        canvas.setStrokeColor(TEAL)
        canvas.setLineWidth(0.8)
        canvas.line(15 * mm, H - 42 * mm, W - 15 * mm, H - 42 * mm)
        canvas.line(15 * mm, 42 * mm, W - 15 * mm, 42 * mm)
        logo_bottom = H - 78 * mm
        try:
            if os.path.exists(logo_path):
                img = ImageReader(logo_path)
                iw, ih = img.getSize()
                dw = 42 * mm
                dh = dw * ih / iw
                canvas.drawImage(img, W / 2 - dw / 2, H - 60 * mm - dh, dw, dh, mask="auto", preserveAspectRatio=True)
                logo_bottom = H - 60 * mm - dh - 6 * mm
        except Exception:
            pass
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 26)
        canvas.drawCentredString(W / 2, logo_bottom, "FOOD SAFETY AGENCY (PTY) LTD")
        canvas.setFillColor(TEAL)
        canvas.setFont("Helvetica", 17)
        canvas.drawCentredString(W / 2, logo_bottom - 11 * mm, "Inspector KPI Report")
        canvas.setFillColor(TEAL)
        canvas.rect(W / 2 - 30 * mm, logo_bottom - 15 * mm, 60 * mm, 1.4, fill=1, stroke=0)
        canvas.setFillColor(GREY_LIGHT)
        canvas.setFont("Helvetica", 12)
        canvas.drawCentredString(W / 2, logo_bottom - 25 * mm, f"{data['period_label']}   ({data['range_label']})")
        canvas.setFillColor(GREY)
        canvas.setFont("Helvetica", 9)
        canvas.drawCentredString(W / 2, logo_bottom - 32 * mm, f"Generated {now.strftime('%d %B %Y  %H:%M')}")
        canvas.setFont("Helvetica", 8)
        canvas.drawCentredString(W / 2, 30 * mm, "CONFIDENTIAL — For authorized personnel only")
        canvas.restoreState()

    def _later(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(GREY)
        canvas.drawString(14 * mm, 9 * mm, f"Inspector KPI Report  ·  {data['period_label']}")
        canvas.drawRightString(W - 14 * mm, 9 * mm, f"Page {doc.page - 1}")
        canvas.restoreState()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=PAGE, topMargin=16 * mm, bottomMargin=16 * mm,
                            leftMargin=14 * mm, rightMargin=14 * mm, title="Inspector KPI Report")
    styles = getSampleStyleSheet()
    sub = ParagraphStyle("sub", parent=styles["Normal"], fontSize=9, textColor=GREY)
    cell = ParagraphStyle("cell", parent=styles["Normal"], fontSize=8, leading=10)
    cellC = ParagraphStyle("cellC", parent=cell, alignment=1)
    cardVal = ParagraphStyle("cardVal", parent=styles["Normal"], fontSize=20, leading=22, alignment=1, fontName="Helvetica-Bold")
    cardLbl = ParagraphStyle("cardLbl", parent=styles["Normal"], fontSize=7, leading=9, alignment=1, textColor=GREY)

    def section(title, note=""):
        extra = f" &nbsp;<font size=8 color='#9ca3af'>{note}</font>" if note else ""
        return [
            Paragraph(f"<font color='#0f172a'><b>{title}</b></font>{extra}",
                      ParagraphStyle("sec", parent=styles["Heading2"], fontSize=12, spaceAfter=2)),
            HRFlowable(width=45 * mm, thickness=1, color=TEAL, spaceAfter=6, hAlign="LEFT"),
        ]

    total = data["total_inspectors"]
    meeting = data["meeting_count"]
    rate = round((meeting / total) * 100) if total else 0

    story = [PageBreak()]  # page 1 is the cover (drawn by _cover); content starts on page 2

    # ── Summary metric cards — real data-quality issues (no target/meeting data) ──
    story += section("Summary")
    card_specs = [
        ("Late Entries (2+ days)", str(data["late_count"]), AMBER),
        ("Missing RFI", str(data["missing_rfi_count"]), RED),
        ("Missing Travel Details", str(data["missing_travel_count"]), TEAL),
        ("Duplicate Inspections", str(data["duplicate_group_count"]), GREEN),
    ]
    card_cells = []
    for label, value, color in card_specs:
        hexc = "#" + color.hexval()[2:]
        card_cells.append([
            Paragraph(f"<font color='{hexc}'>{value}</font>", cardVal),
            Spacer(1, 2),
            Paragraph(label.upper(), cardLbl),
        ])
    card_w = (W - 28 * mm) / 4
    cards = Table([card_cells], colWidths=[card_w] * 4, rowHeights=[24 * mm])
    card_style = [
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f6f8fa")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEAFTER", (0, 0), (-2, -1), 3, colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]
    for i, (_, _, color) in enumerate(card_specs):
        card_style.append(("LINEABOVE", (i, 0), (i, 0), 2.2, color))
    cards.setStyle(TableStyle(card_style))
    story.append(cards)
    story.append(Spacer(1, 8 * mm))

    # ── Late entries — summarised per inspector ──
    story += section("Late Entries by Inspector", f"(captured 2 or more days after the inspection date — {data['late_count']} total)")
    if data["late_summary"]:
        lh = ["Inspector", "Late Entries", "Avg Days Late", "Max Days Late"]
        lrows = [[Paragraph(f"<b>{h}</b>", cellC) for h in lh]]
        lstyle = [
            ("BACKGROUND", (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("LINEBELOW", (0, 0), (-1, -1), 0.4, HAIR),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]
        for r_i, e in enumerate(data["late_summary"], start=1):
            lrows.append([
                Paragraph(e["inspector_name"], cell),
                Paragraph(f"<b>{e['count']}</b>", cellC),
                str(e["avg_days"]), str(e["max_days"]),
            ])
            if r_i % 2 == 0:
                lstyle.append(("BACKGROUND", (0, r_i), (-1, r_i), ROW_ALT))
            lstyle.append(("TEXTCOLOR", (1, r_i), (1, r_i), RED))
        lt = Table(lrows, colWidths=[80 * mm, 50 * mm, 50 * mm, 50 * mm], repeatRows=1)
        lt.setStyle(TableStyle(lstyle))
        story.append(lt)
    else:
        story.append(Paragraph("No late entries for this period.", sub))

    def _simple_table(headers, rows_data, col_widths, red_col=None):
        trows = [[Paragraph(f"<b>{h}</b>", cellC) for h in headers]]
        tstyle = [
            ("BACKGROUND", (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("LINEBELOW", (0, 0), (-1, -1), 0.4, HAIR),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (2, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]
        for r_i, cells in enumerate(rows_data, start=1):
            trows.append(cells)
            if r_i % 2 == 0:
                tstyle.append(("BACKGROUND", (0, r_i), (-1, r_i), ROW_ALT))
            if red_col is not None:
                tstyle.append(("TEXTCOLOR", (red_col, r_i), (red_col, r_i), RED))
        t = Table(trows, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle(tstyle))
        return t

    # ── Missing RFI ──
    story.append(Spacer(1, 8 * mm))
    story += section("Missing RFI", f"(RAW / PMP groups with no RFI assigned — {data['missing_rfi_count']} total)")
    if data["missing_rfi"]:
        rows_data = [[
            Paragraph(e["inspector_name"], cell), Paragraph(e["client_name"], cell),
            e["date"], Paragraph(f"<b>{e['commodities']}</b>", cellC),
        ] for e in data["missing_rfi"]]
        story.append(_simple_table(["Inspector", "Client / Facility", "Date", "Commodities"],
                                    rows_data, [50 * mm, 90 * mm, 44 * mm, 44 * mm]))
        if data["missing_rfi_count"] > len(data["missing_rfi"]):
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"Showing the {len(data['missing_rfi'])} most recent of {data['missing_rfi_count']}.", sub))
    else:
        story.append(Paragraph("Every RAW / PMP group has an RFI assigned. ✓", sub))

    # ── Missing Travel Details — summarised per inspector ──
    story.append(Spacer(1, 8 * mm))
    story += section("Missing Travel Details by Inspector", f"(visits with no km / hours / start / end time — {data['missing_travel_count']} total)")
    if data.get("missing_travel_summary"):
        rows_data = [[
            Paragraph(e["inspector_name"], cell),
            Paragraph(f"<b>{e['count']}</b>", cellC),
        ] for e in data["missing_travel_summary"]]
        story.append(_simple_table(["Inspector", "Visits Missing Travel Details"],
                                    rows_data, [130 * mm, 100 * mm], red_col=1))
    else:
        story.append(Paragraph("Every group has km, hours and travel times recorded. ✓", sub))

    # ── Inspectors flagged as needing sample values (lab-reported) ──
    # Only shown when there are open flags — no empty "all clear" filler.
    if data.get("sample_discrepancies"):
        story.append(Spacer(1, 8 * mm))
        story += section("Marked as Needing Sample Values",
                         f"(the inspector didn't fill in the correct sampling information — {len(data['sample_discrepancies'])} open)")
        rows_data = [[
            Paragraph(e["inspector_name"], cell), Paragraph(e["client_name"] or "—", cell),
            e["date"] or "—", Paragraph(e["note"] or "—", cell), Paragraph(e["reported_by"] or "—", cell),
        ] for e in data["sample_discrepancies"]]
        story.append(_simple_table(["Inspector", "Client / Facility", "Date", "Reason", "Flagged by"],
                                    rows_data, [42 * mm, 56 * mm, 30 * mm, 82 * mm, 40 * mm]))

    # ── Duplicate inspections by inspector ──
    story.append(Spacer(1, 8 * mm))
    story += section("Duplicate Inspections by Inspector",
                     f"(same client, date & products captured more than once — {data.get('duplicate_group_count', 0)} groups involved)")
    if data.get("duplicate_summary"):
        rows_data = [[
            Paragraph(e["inspector_name"], cell),
            Paragraph(f"<b>{e['dup_sets']}</b>", cellC),
            Paragraph(f"<b>{e['extra_copies']}</b>", cellC),
            str(e["clients"]),
        ] for e in data["duplicate_summary"]]
        story.append(_simple_table(
            ["Inspector", "Duplicated Inspections", "Redundant Copies", "Clients Affected"],
            rows_data, [80 * mm, 55 * mm, 50 * mm, 45 * mm], red_col=2))
    else:
        story.append(Paragraph("No duplicate inspections detected this period. ✓", sub))

    doc.build(story, onFirstPage=_cover, onLaterPages=_later)
    buf.seek(0)
    return buf.getvalue()


def _resolve_period(request):
    year = request.GET.get("year") or (request.POST.get("year") if request.method == "POST" else None)
    quarter = request.GET.get("quarter") or (request.POST.get("quarter") if request.method == "POST" else None)
    if year and quarter:
        return int(year), int(quarter)
    return current_quarter()


def _ser_discrepancy(d):
    return {
        "id": d.id,
        "inspector_name": d.inspector_name,
        "client_name": d.client_name,
        "date_of_inspection": d.date_of_inspection.isoformat() if d.date_of_inspection else "",
        "commodity": d.commodity,
        "note": d.note,
        "reported_by": (d.reported_by.get_full_name() or d.reported_by.username) if d.reported_by else "",
        "created_at": d.created_at.isoformat() if d.created_at else "",
        "rectified": d.rectified,
        "rectified_at": d.rectified_at.isoformat() if d.rectified_at else None,
        "rectified_by": (d.rectified_by.get_full_name() or d.rectified_by.username) if d.rectified_by else "",
    }


@csrf_exempt
@login_required
@role_required(["super_admin", "developer", "lab_technician"])
def api_sample_discrepancies(request):
    """
    Lab-reported "inspector didn't record a sample" flags.
    GET  → list;  POST {inspector_name, client_name?, date_of_inspection?, commodity?, note?} → create.
    Only super admins and lab technicians may access.
    """
    from ..models import SampleDiscrepancy
    try:
        if request.method == "GET":
            items = SampleDiscrepancy.objects.select_related("reported_by", "rectified_by").all()[:300]
            return _cors(JsonResponse({"success": True, "discrepancies": [_ser_discrepancy(d) for d in items]}))

        if request.method == "POST":
            import json
            body = json.loads(request.body or "{}")
            inspector = (body.get("inspector_name") or "").strip()
            if not inspector:
                return _cors(JsonResponse({"success": False, "error": "Inspector is required"}, status=400))
            d = SampleDiscrepancy.objects.create(
                inspector_name=inspector,
                client_name=(body.get("client_name") or "").strip(),
                date_of_inspection=(body.get("date_of_inspection") or None),
                commodity=(body.get("commodity") or "").strip(),
                note=(body.get("note") or "").strip(),
                reported_by=request.user if request.user.is_authenticated else None,
            )
            return _cors(JsonResponse({"success": True, "discrepancy": _ser_discrepancy(d)}))

        return _cors(JsonResponse({"success": False, "error": "Invalid method"}, status=405))
    except Exception as e:
        return _cors(JsonResponse({"success": False, "error": str(e)}, status=500))


@csrf_exempt
@login_required
@role_required(["super_admin", "developer", "lab_technician"])
def api_sample_discrepancy_rectify(request, pk):
    """Toggle the rectified state of a sample discrepancy."""
    from django.utils import timezone
    from ..models import SampleDiscrepancy
    try:
        d = SampleDiscrepancy.objects.get(pk=pk)
    except SampleDiscrepancy.DoesNotExist:
        return _cors(JsonResponse({"success": False, "error": "Not found"}, status=404))
    d.rectified = not d.rectified
    d.rectified_at = timezone.now() if d.rectified else None
    d.rectified_by = request.user if (d.rectified and request.user.is_authenticated) else None
    d.save(update_fields=["rectified", "rectified_at", "rectified_by"])
    return _cors(JsonResponse({"success": True, "rectified": d.rectified}))


def _find_inspector_email(inspector_name):
    """Resolve an inspector's User email from their display name (first last / username)."""
    from django.contrib.auth.models import User
    name = (inspector_name or "").strip()
    if not name:
        return None, None
    # Match on full name (first + last) first, then username — case-insensitive.
    for u in User.objects.exclude(email="").filter(is_active=True):
        full = f"{u.first_name} {u.last_name}".strip()
        if full and full.lower() == name.lower():
            return u.email, (u.first_name or full)
    u = User.objects.filter(username__iexact=name, is_active=True).exclude(email="").first()
    if u:
        return u.email, (u.first_name or u.username)
    return None, None


def _notify_inspector_of_discrepancy(inspector_name, client_name, date_of_inspection, reported_by=None):
    """
    Email the inspector a friendly, positive, professional reminder that the
    sampling information for a visit is missing or needs correcting.
    Best-effort: never raises. Returns True if an email was sent.
    """
    try:
        to_email, first_name = _find_inspector_email(inspector_name)
        if not to_email:
            return False
        from django.core.mail import EmailMessage

        when = ""
        if date_of_inspection:
            try:
                d = date_of_inspection
                if isinstance(d, str):
                    d = datetime.datetime.strptime(d[:10], "%Y-%m-%d").date()
                when = d.strftime("%d %b %Y")
            except Exception:
                when = str(date_of_inspection)
        visit_bits = []
        if client_name:
            visit_bits.append(f"<b>{client_name}</b>")
        if when:
            visit_bits.append(f"on <b>{when}</b>")
        visit = (" your visit to " + " ".join(visit_bits)) if visit_bits else " one of your recent visits"

        greeting = f"Hi {first_name}," if first_name else "Hi there,"
        subject = "Quick follow-up on your recent inspection — sampling details"
        html = (
            "<div style='font-family:Arial,sans-serif;color:#1f2937;font-size:14px;line-height:1.55;'>"
            f"<p>{greeting}</p>"
            "<p>Thank you for your continued work out in the field — it's genuinely appreciated.</p>"
            f"<p>While reviewing the lab samples for{visit}, we noticed that some of the "
            "sampling information appears to be missing or may need a small correction.</p>"
            "<p>When you have a moment, could you please review this visit and update the "
            "sampling details so our records stay accurate and complete? It really helps keep "
            "everything running smoothly on the lab side.</p>"
            "<p>If anything is unclear or you'd like a hand, just reply to this email and we'll "
            "be glad to help.</p>"
            "<p>Thanks so much,<br><strong>APS Inspection System</strong></p></div>"
        )
        reply_to = [getattr(reported_by, "email", "") or settings.DEFAULT_FROM_EMAIL]
        msg = EmailMessage(
            subject=subject, body=html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email], reply_to=reply_to,
        )
        msg.content_subtype = "html"
        msg.send(fail_silently=False)
        return True
    except Exception as e:
        try:
            print(f"[DISCREPANCY EMAIL] failed to notify inspector '{inspector_name}': {e}")
        except Exception:
            pass
        return False


@csrf_exempt
@login_required
@role_required(["super_admin", "developer", "lab_technician"])
def api_toggle_group_discrepancy(request):
    """
    Toggle a "missing sample" flag for an inspection group (from the Inspections list).
    POST {group_id, inspector_name?, client_name?, date_of_inspection?} → creates the flag
    if none is open for that group, or removes the open one. Returns {flagged}.
    """
    from ..models import SampleDiscrepancy
    if request.method != "POST":
        return _cors(JsonResponse({"success": False, "error": "Invalid method"}, status=405))
    import json
    body = json.loads(request.body or "{}")
    group_id = str(body.get("group_id") or "").strip()
    if not group_id:
        return _cors(JsonResponse({"success": False, "error": "group_id required"}, status=400))
    existing = SampleDiscrepancy.objects.filter(inspection_group_id=group_id, rectified=False).first()
    if existing:
        existing.delete()
        return _cors(JsonResponse({"success": True, "flagged": False}))
    _inspector_name = (body.get("inspector_name") or "").strip()
    _client_name = (body.get("client_name") or "").strip()
    _doi = (body.get("date_of_inspection") or None)
    SampleDiscrepancy.objects.create(
        inspection_group_id=group_id,
        inspector_name=_inspector_name,
        client_name=_client_name,
        date_of_inspection=_doi,
        note="Inspector did not add the correct sampling information for this visit.",
        reported_by=request.user if request.user.is_authenticated else None,
    )
    # Send the inspector a friendly reminder to review/correct the sampling info.
    reminder_sent = _notify_inspector_of_discrepancy(
        inspector_name=_inspector_name,
        client_name=_client_name,
        date_of_inspection=_doi,
        reported_by=request.user if request.user.is_authenticated else None,
    )
    return _cors(JsonResponse({"success": True, "flagged": True, "reminder_email_sent": reminder_sent}))


@login_required
@role_required(["super_admin", "developer", "lab_technician"])
def api_open_discrepancy_groups(request):
    """Return the group ids that currently have an open (not-rectified) flag."""
    from ..models import SampleDiscrepancy
    ids = list(
        SampleDiscrepancy.objects.filter(rectified=False)
        .exclude(inspection_group_id="").exclude(inspection_group_id__isnull=True)
        .values_list("inspection_group_id", flat=True).distinct()
    )
    return _cors(JsonResponse({"success": True, "group_ids": ids}))


@csrf_exempt
@login_required
@role_required(["super_admin", "developer", "admin"])
def api_kpi_report(request):
    """
    GET  ?format=pdf[&year=&quarter=]  → download the PDF
    GET  ?info=1                        → last-sent info (JSON)
    POST {email, year?, quarter?}       → email the PDF, log it, return last-sent
    """
    try:
        # Last-sent info + summary metrics
        if request.method == "GET" and request.GET.get("info"):
            last = Notification.objects.filter(related_object_type="kpi_report").order_by("-created_at").first()
            today = datetime.date.today()
            samples_this_month = FoodSafetyAgencyInspection.objects.filter(
                date_of_inspection__year=today.year,
                date_of_inspection__month=today.month,
                is_sample_taken=True,
            ).count()
            emails_sent = Notification.objects.filter(related_object_type="kpi_report").count()
            return _cors(JsonResponse({
                "success": True,
                "last_sent": ({
                    "sent_at": last.created_at.isoformat(),
                    "message": last.message,
                } if last else None),
                "samples_this_month": samples_this_month,
                "emails_sent": emails_sent,
            }))

        year, quarter = _resolve_period(request)

        if request.method == "GET":
            data = build_kpi_report_data(year, quarter)
            pdf = generate_kpi_pdf(data)
            resp = HttpResponse(pdf, content_type="application/pdf")
            resp["Content-Disposition"] = f'attachment; filename="inspector-kpi-report-Q{quarter}-{year}.pdf"'
            return _cors(resp)

        if request.method == "POST":
            import json
            body = json.loads(request.body or "{}")
            recipient = (body.get("email") or "").strip()
            if not recipient:
                return _cors(JsonResponse({"success": False, "error": "Recipient email required"}, status=400))
            year = int(body.get("year")) if body.get("year") else year
            quarter = int(body.get("quarter")) if body.get("quarter") else quarter

            data = build_kpi_report_data(year, quarter)
            pdf = generate_kpi_pdf(data)

            from django.core.mail import EmailMessage
            subject = f"Inspector KPI Report — {data['period_label']}"
            html = (
                f"<div style='font-family:Arial,sans-serif;color:#1f2937;'>"
                f"<p>Please find attached the Inspector KPI Report for <b>{data['period_label']}</b>.</p>"
                f"<p><b>{data['meeting_count']}</b> of <b>{data['total_inspectors']}</b> inspectors are meeting their KPI targets. "
                f"<b>{data['late_count']}</b> late entries were recorded this period.</p>"
                f"<p>Kind Regards,<br><strong>APS Inspection System</strong></p></div>"
            )
            email = EmailMessage(
                subject=subject, body=html,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient], reply_to=[settings.DEFAULT_FROM_EMAIL],
            )
            email.content_subtype = "html"
            email.attach(f"inspector-kpi-report-Q{quarter}-{year}.pdf", pdf, "application/pdf")
            sent_count = email.send(fail_silently=False)

            # The Graph backend returns 0 (without raising) when credentials are
            # missing — e.g. local dev. Treat that as a real failure so we don't
            # report a false success or log a phantom "sent" notification.
            if not sent_count:
                return _cors(JsonResponse({
                    "success": False,
                    "error": "Email could not be sent — the mail service is not configured in this environment. "
                             "This will send normally on the live server.",
                }, status=502))

            # Log the send so it can be reviewed ("last sent out notification")
            Notification.notify_super_admins(
                title="KPI Report sent",
                message=f"Inspector KPI Report ({data['period_label']}) emailed to {recipient}.",
                notification_type="success",
                priority="medium",
                action_url="/notifications",
            )
            note = Notification.objects.filter(related_object_type=None, title="KPI Report sent").order_by("-created_at").first()
            if note:
                note.related_object_type = "kpi_report"
                note.related_object_id = recipient
                note.save(update_fields=["related_object_type", "related_object_id"])

            return _cors(JsonResponse({
                "success": True,
                "message": f"KPI report emailed to {recipient}",
                "last_sent": {"sent_at": datetime.datetime.now().isoformat(), "recipient": recipient,
                              "period": data["period_label"]},
            }))

        return _cors(JsonResponse({"success": False, "error": "Invalid method"}, status=405))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return _cors(JsonResponse({"success": False, "error": str(e)}, status=500))
