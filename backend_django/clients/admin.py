from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "store", "phone", "cpf", "is_active")
    search_fields = ("name", "cpf", "phone", "email", "legacy_id")
    list_filter = ("store", "is_active")
