from django.contrib import admin

from .models import Installment


@admin.register(Installment)
class InstallmentAdmin(admin.ModelAdmin):
    list_display = ("sale", "quote", "store", "installment_number", "due_date", "amount", "paid", "paid_at")
    search_fields = ("sale__sale_number", "sale__client__name", "quote__client__name", "legacy_id")
    list_filter = ("store", "paid", "due_date")
