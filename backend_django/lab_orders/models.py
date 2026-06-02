from django.db import models

from clients.models import Client
from prescriptions.models import Prescription
from stores.models import Store, TimeStampedModel


class LabOrder(TimeStampedModel):
    class Status(models.TextChoices):
        SENT = "sent", "Sent"
        LAB = "lab", "Lab"
        READY = "ready", "Ready"
        RETURNED = "returned", "Returned"
        DELIVERED = "delivered", "Delivered"

    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="lab_orders")
    legacy_id = models.CharField(max_length=80, blank=True, db_index=True)
    order_number = models.CharField(max_length=80)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="lab_orders")
    prescription = models.ForeignKey(Prescription, on_delete=models.PROTECT, related_name="lab_orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SENT)
    laboratory = models.CharField(max_length=120, blank=True)
    expected_at = models.DateField(blank=True, null=True)
    returned_at = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True)
    snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["store", "order_number"]),
            models.Index(fields=["store", "status"]),
        ]
        unique_together = [("store", "order_number")]

    def __str__(self):
        return self.order_number
