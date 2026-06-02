from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "store", "username", "action", "entity_type", "entity_id")
    search_fields = ("username", "action", "entity_type", "entity_id", "summary", "legacy_id")
    list_filter = ("store", "action", "entity_type", "created_at")
    readonly_fields = ("created_at",)
