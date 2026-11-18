"""Create the Django admin login from environment variables, once.

Render's free tier has no shell for `createsuperuser`, so the deploy runs this instead.
Set DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD;
without them it does nothing. An existing user is never changed.
"""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create the admin user from DJANGO_SUPERUSER_* environment variables if it doesn't exist."

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "")
        if not (username and password):
            self.stdout.write("No DJANGO_SUPERUSER_* settings; skipping admin user.")
            return
        user_model = get_user_model()
        if user_model.objects.filter(username=username).exists():
            self.stdout.write(f"Admin user {username!r} already exists.")
            return
        user_model.objects.create_superuser(
            username=username, email=os.environ.get("DJANGO_SUPERUSER_EMAIL", ""), password=password
        )
        self.stdout.write(self.style.SUCCESS(f"Created admin user {username!r}."))
