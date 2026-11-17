from django.contrib import admin

from catalog import models


@admin.register(models.Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "rate_per_usd", "decimals"]


@admin.register(models.Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "tax_name", "tax_rate", "currency"]


@admin.register(models.SharedPlan, models.OperatingSystem, models.CloudSize, models.BandwidthPackage, models.AddOn, models.SslOption)
class PricedItemAdmin(admin.ModelAdmin):
    list_display = ["slug", "name", "monthly_usd"]


@admin.register(models.DedicatedServer)
class DedicatedServerAdmin(admin.ModelAdmin):
    list_display = ["slug", "name", "monthly_usd"]
    filter_horizontal = ["out_of_stock_at"]


@admin.register(models.Tld)
class TldAdmin(admin.ModelAdmin):
    list_display = ["tld", "register_usd", "renew_usd", "transfer_usd", "privacy_supported", "free_with_hosting"]


@admin.register(models.Promo)
class PromoAdmin(admin.ModelAdmin):
    list_display = ["code", "label", "percent", "applies_to", "valid_until"]


admin.site.register([models.ProductCategory, models.CycleDiscount, models.VpsPricing, models.DataCenter, models.ScalingPreset])
