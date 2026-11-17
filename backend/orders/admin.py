from django.contrib import admin

from orders.models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = [f.name for f in OrderItem._meta.fields]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["number", "email", "total", "currency", "status", "created_at"]
    list_filter = ["status", "currency"]
    search_fields = ["email", "full_name"]
    inlines = [OrderItemInline]
    readonly_fields = ["reference", "idempotency_key", "payment_reference"]
