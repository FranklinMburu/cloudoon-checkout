from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Load the catalog fixture and create the demo customer (safe to run on every deploy)."

    def handle(self, *args, **options):
        call_command("loaddata", "catalog", verbosity=0)
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=settings.DEMO_USER_EMAIL,
            defaults={"email": settings.DEMO_USER_EMAIL, "first_name": "Amina", "last_name": "Wanjiru"},
        )
        if created:
            user.set_password(settings.DEMO_USER_PASSWORD)
            user.save()
        self.stdout.write(self.style.SUCCESS(f"Catalog loaded; demo user {'created' if created else 'exists'}."))
