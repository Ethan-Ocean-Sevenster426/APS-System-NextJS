from django.core.management.base import BaseCommand
from django.db import transaction

from main.models import InspectorMapping


class Command(BaseCommand):
    help = "Upsert InspectorMapping IDs from a predefined list (provided by HR)."

    def handle(self, *args, **options):
        # Data provided: Id, IsActive, FirstName, LastName, Email, IsDisabled, ContactNumber
        # We only use Id, IsActive, FirstName, LastName. Email kept for potential future cross-checks.
        rows = [
            {"Id": 68, "IsActive": 1, "FirstName": "BEN", "LastName": "VISAGIE", "Email": "ben.visagie@afsq.co.za"},
            {"Id": 70, "IsActive": 1, "FirstName": "THERESA", "LastName": "DIOGO", "Email": "theresa.diogo@afsq.co.za"},
            {"Id": 71, "IsActive": 1, "FirstName": "PALESA", "LastName": "MPANA", "Email": "palesa.mpana@afsq.co.za"},
            {"Id": 72, "IsActive": 1, "FirstName": "CHARMAINE", "LastName": "NEL", "Email": "charmaine.nel@afsq.co.za"},
            {"Id": 73, "IsActive": 0, "FirstName": "RAM", "LastName": "RAMBURAN", "Email": "ram.ramburan@afsq.co.za"},
            {"Id": 74, "IsActive": 0, "FirstName": "HEIN", "LastName": "NEL", "Email": "hein.nel@afsq.co.za"},
            {"Id": 75, "IsActive": 0, "FirstName": "SIBONELO", "LastName": "ZONDI", "Email": "sibonelo.zondi@afsq.co.za"},
            {"Id": 76, "IsActive": 1, "FirstName": "PETRUS", "LastName": "POOL", "Email": "petrus.pool@afsq.co.za"},
            {"Id": 77, "IsActive": 1, "FirstName": "DELAREY", "LastName": "RIBBENS", "Email": "delarey.ribbens@afsq.co.za"},
            {"Id": 78, "IsActive": 1, "FirstName": "DEWALD", "LastName": "KORF", "Email": "dewald.korf@afsq.co.za"},
            {"Id": 79, "IsActive": 1, "FirstName": "WENDY", "LastName": "CHAKA", "Email": "wendy.chaka@afsq.co.za"},
            {"Id": 80, "IsActive": 0, "FirstName": "NIPHO", "LastName": "NGOMANE", "Email": "nipho.ngomane@afsq.co.za"},
            {"Id": 81, "IsActive": 0, "FirstName": "CHELESILE", "LastName": "MOYO", "Email": "chelesile.moyo@afsq.co.za"},
            {"Id": 82, "IsActive": 1, "FirstName": "JOE", "LastName": "ROSENBLATT", "Email": "joe.rosenblatt@afsq.co.za"},
            {"Id": 83, "IsActive": 0, "FirstName": "SIMON", "LastName": "SWART", "Email": "simon.swart@afsq.co.za"},
            {"Id": 84, "IsActive": 1, "FirstName": "ANDREAS", "LastName": "LETABA", "Email": "andreas.letaba@afsq.co.za"},
            {"Id": 85, "IsActive": 1, "FirstName": "JOEL", "LastName": "MHANGWA", "Email": "joel.mhangwa@afsq.co.za"},
            {"Id": 86, "IsActive": 1, "FirstName": "ASISIPHO", "LastName": "LANDE", "Email": "asisipho.lande@afsq.co.za"},
            {"Id": 87, "IsActive": 1, "FirstName": "LOUIS", "LastName": "VISAGIE", "Email": "louis.visagie@afsq.co.za"},
            {"Id": 88, "IsActive": 0, "FirstName": "RASSIE", "LastName": "SMIT", "Email": "rassie.smit@afsq.co.za"},
            {"Id": 89, "IsActive": 1, "FirstName": "NICOLE", "LastName": "BERGH", "Email": "nicole.bergh@afsq.co.za"},
            {"Id": 91, "IsActive": 0, "FirstName": "MONTI", "LastName": "RAMAANO", "Email": "monti.ramaano@afsq.co.za"},
            {"Id": 92, "IsActive": 1, "FirstName": "THABO", "LastName": "MAGWAZA", "Email": "thabo.magwaza@afsq.co.za"},
            {"Id": 93, "IsActive": 1, "FirstName": "VICTOR", "LastName": "MATHEBULA", "Email": "victor.mathebula@afsq.co.za"},
            {"Id": 94, "IsActive": 1, "FirstName": "FRANCOIS", "LastName": "PRETORIUS", "Email": "francois.pretorius@afsq.co.za"},
            {"Id": 95, "IsActive": 1, "FirstName": "EVANS", "LastName": "NKWINIKA", "Email": "evans.nkwinika@afsq.co.za"},
            {"Id": 96, "IsActive": 1, "FirstName": "MCAULEY", "LastName": "MUSUNDA", "Email": "mcauley.musunda@afsq.co.za"},
            {"Id": 97, "IsActive": 1, "FirstName": "NAKISANI", "LastName": "BALOYI", "Email": "nakisani.baloyi@afsq.co.za"},
            {"Id": 102, "IsActive": 0, "FirstName": "ALI", "LastName": "MODIKOE", "Email": "ali.modikoe@afsq.co.za"},
            {"Id": 103, "IsActive": 1, "FirstName": "GERRIT", "LastName": "PEKEMA", "Email": "gerrit.pekema@afsq.co.za"},
            {"Id": 105, "IsActive": 0, "FirstName": "CHRISTIAAN", "LastName": "WOLMARANS", "Email": "christiaan.wolmarans@afsq.co.za"},
            {"Id": 106, "IsActive": 1, "FirstName": "ARMAND", "LastName": "VISAGIE", "Email": "armand.visagie@afsq.co.za"},
            {"Id": 113, "IsActive": 0, "FirstName": "KATLEGO", "LastName": "MOKHUA", "Email": "katlego.mokhua@afsq.co.za"},
            {"Id": 116, "IsActive": 1, "FirstName": "FINANCE", "LastName": "TWO", "Email": "finance2@afsq.co.za"},
            {"Id": 118, "IsActive": 1, "FirstName": "NEO", "LastName": "NOE", "Email": "neonoe@afsq.co.za"},
            {"Id": 123, "IsActive": 0, "FirstName": "LIZELLE", "LastName": "BREEDT", "Email": "lizelle.breedt@afsq.co.za"},
            {"Id": 124, "IsActive": 1, "FirstName": "SANDISIWE", "LastName": "DLISANI", "Email": "Sandisiwe.dlisani@afsq.co.za"},
            {"Id": 125, "IsActive": 1, "FirstName": "MARIUS", "LastName": "CARSTENS", "Email": "marius.carstens@afsq.co.za"},
            {"Id": 126, "IsActive": 0, "FirstName": "THAPELO", "LastName": "MAPOTSE", "Email": "thapelo.mapotse@afsq.co.za"},
            {"Id": 127, "IsActive": 0, "FirstName": "THAPELO", "LastName": "MAPOTSE", "Email": "thapelo.mapotse@afsq.co.za"},
            {"Id": 131, "IsActive": 1, "FirstName": "EDITH", "LastName": "SELEPE", "Email": "edith.selepe@afsq.co.za"},
            {"Id": 132, "IsActive": 1, "FirstName": "PAKI", "LastName": "OLIFANT", "Email": "paki.olifant@afsq.co.za"},
            {"Id": 133, "IsActive": 1, "FirstName": "CALVIN", "LastName": "CLAASSENS", "Email": "calvin.claassens@afsq.co.za"},
            {"Id": 140, "IsActive": 1, "FirstName": "AGREEMENT", "LastName": "MOSIA", "Email": "mosia.agreement@afsq.co.za"},
            {"Id": 141, "IsActive": 1, "FirstName": "IT", "LastName": "IT", "Email": "it@afsq.co.za"},
            {"Id": 142, "IsActive": 0, "FirstName": "MARIANA", "LastName": "DU TOIT", "Email": "mariana.dutoit@afsq.co.za"},
            {"Id": 143, "IsActive": 1, "FirstName": "MOKGADI", "LastName": "SELONE", "Email": "Mokgadi.Seloane@afsq.co.za"},
            {"Id": 144, "IsActive": 1, "FirstName": "VHAHANGWELE", "LastName": "RALULIMI", "Email": "hangwe.ralulimi@afsq.co.za"},
            {"Id": 145, "IsActive": 0, "FirstName": "WILSON", "LastName": "MAIFO", "Email": "wilson.maifo@afsq.co.za"},
            {"Id": 146, "IsActive": 1, "FirstName": "ELIAS", "LastName": "THEKISO", "Email": "elias.thekiso@afsq.co.za"},
            {"Id": 147, "IsActive": 0, "FirstName": "BRIAN", "LastName": "XULU", "Email": "brian.xulu@afsq.co.za"},
            {"Id": 148, "IsActive": 1, "FirstName": "COLLEN", "LastName": "DLAMINI", "Email": "collen.dlamini@afsq.co.za"},
            {"Id": 149, "IsActive": 1, "FirstName": "THEMBA", "LastName": "SHABANGU", "Email": "themba.shabangu@afsq.co.za"},
            {"Id": 150, "IsActive": 1, "FirstName": "CHRISNA", "LastName": "POOL", "Email": "Chrisna.pool@afsq.co.za"},
            {"Id": 153, "IsActive": 1, "FirstName": "JOFRED", "LastName": "STEYN", "Email": "jofred.steyn@afsq.co.za"},
            {"Id": 154, "IsActive": 1, "FirstName": "SEUN", "LastName": "SEBOLAI", "Email": "seun.sebolai@afsq.co.za"},
            {"Id": 160, "IsActive": 0, "FirstName": "LERATO", "LastName": "MODIBA", "Email": "lerato.modiba@afsq.co.za"},
            {"Id": 163, "IsActive": 1, "FirstName": "DENNIS", "LastName": "CELE", "Email": "dennis.cele@afsq.co.za"},
            {"Id": 164, "IsActive": 1, "FirstName": "HENNIE", "LastName": "CHILOANE", "Email": "hennie.chiloane@afsq.co.za"},
            {"Id": 166, "IsActive": 1, "FirstName": "THATO", "LastName": "SEKHOTHO", "Email": "thato.sekhotho@afsq.co.za"},
            {"Id": 173, "IsActive": 1, "FirstName": "HLENGIWE", "LastName": "GUMEDE", "Email": "Hlengiwe.gumede@afsq.co.za"},
            {"Id": 174, "IsActive": 1, "FirstName": "LWANDILE", "LastName": "MAQINA", "Email": "lwandile.maqina@afsq.co.za"},
            {"Id": 175, "IsActive": 1, "FirstName": "PETRUS", "LastName": "POOL", "Email": "petrus.pool@afsq.co.za"},
            {"Id": 177, "IsActive": 1, "FirstName": "CINGA", "LastName": "NGONGO", "Email": "cinga.ngongo@afsq.co.za"},
            {"Id": 178, "IsActive": 1, "FirstName": "NTABISENG", "LastName": "MASEKO", "Email": "admin@afsq.co.za"},
            {"Id": 179, "IsActive": 1, "FirstName": "KABELO", "LastName": "MOKGALAKA", "Email": "kabelo.mokgalaka@afsq.co.za"},
            {"Id": 183, "IsActive": 1, "FirstName": "MPHO", "LastName": "MOTAUNG", "Email": "mpho.motaung@afsq.co.za"},
            {"Id": 184, "IsActive": 1, "FirstName": "XOLA", "LastName": "MPELUZA", "Email": "xola.mpeluza@afsq.co.za"},
            {"Id": 185, "IsActive": 1, "FirstName": "PERCY", "LastName": "MALEKA", "Email": "percy.maleka@afsq.co.za"},
            {"Id": 186, "IsActive": 1, "FirstName": "KUTLWANO", "LastName": "KUNTWANE", "Email": "kutlwano.kuntwane@afsq.co.za"},
            {"Id": 187, "IsActive": 1, "FirstName": "SIPHO", "LastName": "NDAMASE", "Email": "sipho.ndamase@afsq.co.za"},
            {"Id": 188, "IsActive": 1, "FirstName": "GLADYS", "LastName": "MANGANYE", "Email": "gladys.manganye@afsq.co.za"},
            {"Id": 194, "IsActive": 1, "FirstName": "PHUMZILE", "LastName": "MASOMBUKA", "Email": "phumzile.masombuka@afsq.co.za"},
            {"Id": 196, "IsActive": 1, "FirstName": "NELISA", "LastName": "NTOYAPHI", "Email": "nelisa.ntoyaphi@afsq.co.za"},
            {"Id": 197, "IsActive": 1, "FirstName": "HAZEL", "LastName": "SOSIBO", "Email": "hazel.sosibo@afsq.co.za"},
            {"Id": 198, "IsActive": 1, "FirstName": "BRITTNEY", "LastName": "PILLAY", "Email": "brittney.pillay@afsq.co.za"},
            {"Id": 202, "IsActive": 1, "FirstName": "DIMAKATSO", "LastName": "MODIBA", "Email": "dimakatso.modiba@afsq.co.za"},
            {"Id": 203, "IsActive": 0, "FirstName": "LEBO", "LastName": "SEKGOBANE", "Email": "lebogang.sekgobane@afsq.co.za"},
            {"Id": 204, "IsActive": 1, "FirstName": "CORNELIUS", "LastName": "ADAMS", "Email": "cornelius.adams@afsq.co.za"},
        ]

        updated = 0
        created = 0
        name_to_row = {}

        def normalize_name(first: str, last: str) -> str:
            # Preserve multi-word last names casing better by title-casing each token
            full = f"{first.strip()} {last.strip()}"
            # Keep uppercase/acronym names as provided; we will match case-insensitively
            return full

        # Build a map for quick lookups
        for r in rows:
            full_name = normalize_name(r["FirstName"], r["LastName"]) if r.get("LastName") else r["FirstName"].strip()
            name_to_row[full_name.lower()] = r

        with transaction.atomic():
            for display_name_lower, r in name_to_row.items():
                inspector_id = int(r["Id"]) if r.get("Id") is not None else None
                is_active = bool(r.get("IsActive", 1))
                display_name = normalize_name(r["FirstName"], r.get("LastName", ""))

                existing = (
                    InspectorMapping.objects.filter(inspector_name__iexact=display_name)
                    .first()
                )

                if existing:
                    changed = False
                    if existing.inspector_id != inspector_id:
                        existing.inspector_id = inspector_id
                        changed = True
                    if existing.is_active != is_active:
                        existing.is_active = is_active
                        changed = True
                    if changed:
                        existing.save(update_fields=["inspector_id", "is_active", "updated_at"])
                        updated += 1
                else:
                    InspectorMapping.objects.create(
                        inspector_id=inspector_id,
                        inspector_name=display_name,
                        is_active=is_active,
                    )
                    created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Inspector mappings processed. Created: {created}, Updated: {updated}"
        ))


