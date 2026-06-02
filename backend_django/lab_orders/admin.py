from django.contrib import admin

from .models import LabOrder


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "store", "client", "status", "laboratory", "expected_at", "returned_at")
    search_fields = ("order_number", "client__name", "laboratory", "legacy_id")
    list_filter = ("store", "status", "laboratory")
