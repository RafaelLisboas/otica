from django.contrib import admin

from .models import StockItem, StockMovement


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = ("name", "store", "code", "category", "quantity", "minimum", "price", "is_active")
    search_fields = ("name", "brand", "code", "legacy_id")
    list_filter = ("store", "category", "is_active")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("item", "store", "movement_type", "quantity", "reason", "created_at")
    search_fields = ("item__name", "item__code", "reason", "reference")
    list_filter = ("store", "movement_type", "created_at")
