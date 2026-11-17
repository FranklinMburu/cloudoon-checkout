from django.apps import AppConfig
from django.db.models.signals import m2m_changed, post_delete, post_save


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "catalog"

    def ready(self):
        from pricing.loader import CATALOG_MODELS, clear_catalog_cache

        # Any change to a catalog row (admin edit, fixture load) invalidates the cached catalog.
        for model in CATALOG_MODELS:
            post_save.connect(clear_catalog_cache, sender=model, dispatch_uid=f"catalog-cache-save-{model.__name__}")
            post_delete.connect(clear_catalog_cache, sender=model, dispatch_uid=f"catalog-cache-del-{model.__name__}")
        m2m_changed.connect(clear_catalog_cache, dispatch_uid="catalog-cache-m2m")
