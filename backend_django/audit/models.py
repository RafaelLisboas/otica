from django.conf import settings
from django.db import models

from stores.models import Store


class AuditLog(models.Model):
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="audit_logs")
    legacy_id = models.CharField(max_length=80, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        blank=True,
        null=True,
    )
    username = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=80)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80, blank=True)
    summary = models.CharField(max_length=255)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["store", "created_at"]),
            models.Index(fields=["store", "entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"{self.action} - {self.summary}"
