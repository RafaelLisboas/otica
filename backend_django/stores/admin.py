from django.contrib import admin

from .models import Company, Store


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "document", "phone", "is_active")
    search_fields = ("name", "document", "phone")
    list_filter = ("is_active",)


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "document", "phone", "is_active")
    search_fields = ("name", "company__name", "document", "phone")
    list_filter = ("company", "is_active")
