from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password

from core.models import PoliceOffice


class Command(BaseCommand):
    help = (
        "Re-hash PoliceOffice.password_hash values that are currently plain text.\n"
        "This fixes Police login 401 when old records stored raw passwords.\n"
        "Safe: already-hashed passwords are not changed."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated, but don't write changes.",
        )

    def handle(self, *args, **options):
        dry_run = bool(options.get("dry_run"))

        # Django hashes look like: "<algo>$<salt>$<hash>"
        known_prefixes = (
            "pbkdf2_sha256$",
            "argon2$",
            "bcrypt_sha256$",
        )

        qs = PoliceOffice.objects.all().order_by("email")
        total = qs.count()
        fixed = 0
        skipped = 0

        self.stdout.write(f"PoliceOffice rows: {total}")
        for office in qs:
            raw = office.password_hash or ""
            if not raw:
                skipped += 1
                self.stdout.write(f"- SKIP {office.email}: empty password_hash")
                continue

            if any(raw.startswith(p) for p in known_prefixes):
                skipped += 1
                self.stdout.write(f"- OK   {office.email}: already hashed ({raw.split('$', 1)[0]})")
                continue

            # Plain text detected; re-hash using Django's make_password
            fixed += 1
            self.stdout.write(f"- FIX  {office.email}: plaintext -> pbkdf2_sha256")
            if not dry_run:
                office.password_hash = make_password(raw)
                office.save(update_fields=["password_hash"])

        if dry_run:
            self.stdout.write(self.style.WARNING(f"DRY RUN complete. Would fix={fixed}, skipped={skipped}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Done. Fixed={fixed}, skipped={skipped}"))


