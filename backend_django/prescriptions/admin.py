from django.contrib import admin

from .models import Prescription


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("client", "store", "date", "doctor", "crm")
    search_fields = ("client__name", "doctor", "crm", "legacy_id")
    list_filter = ("store", "date")
