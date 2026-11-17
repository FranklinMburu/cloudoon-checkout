from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand

from catalog.models import Currency


class Command(BaseCommand):
    help = (
        "Load the catalog fixture (only into an empty catalog, so prices edited in the admin survive "
        "deploys) and create the demo customer. Safe to run on every deploy. Use --reset to reload the fixture."
    )

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Reload the fixture, overwriting catalog edits.")

    def handle(self, *args, reset: bool = False, **options):
        if reset or not Currency.objects.exists():
            call_command("loaddata", "catalog", verbosity=0)
            self.stdout.write("Catalog loaded from fixture.")
        else:
            self.stdout.write("Catalog already present; leaving it unchanged.")

        user_model = get_user_model()
        demo, created = user_model.objects.get_or_create(
            username=settings.DEMO_USER_EMAIL,
            defaults={"email": settings.DEMO_USER_EMAIL, "first_name": "Amina", "last_name": "Wanjiru"},
        )
        if created:
            demo.set_password(settings.DEMO_USER_PASSWORD)
            demo.save()
        self.stdout.write(self.style.SUCCESS(f"Demo customer {'created' if created else 'already exists'}."))
