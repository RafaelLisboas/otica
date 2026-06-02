from django.contrib import admin

from .models import Quote, Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ("id", "store", "client", "status", "total_amount", "created_at")
    search_fields = ("client__name", "legacy_id", "frame_code")
    list_filter = ("store", "status", "created_at")


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("sale_number", "store", "client", "workflow_status", "total_amount", "created_at")
    search_fields = ("sale_number", "client__name", "legacy_id")
    list_filter = ("store", "workflow_status", "created_at")
    inlines = [SaleItemInline]


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ("description", "store", "sale", "quantity", "unit_price", "total_price")
    search_fields = ("description", "sale__sale_number", "stock_item__code")
    list_filter = ("store",)
