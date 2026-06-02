from django.db import models

from clients.models import Client
from lab_orders.models import LabOrder
from prescriptions.models import Prescription
from stock.models import StockItem
from stores.models import Store, TimeStampedModel


class Quote(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="quotes")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="quotes")
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.SET_NULL,
        related_name="quotes",
        blank=True,
        null=True,
    )
    lab_order = models.ForeignKey(
        LabOrder,
        on_delete=models.SET_NULL,
        related_name="quotes",
        blank=True,
        null=True,
    )
    legacy_id = models.CharField(max_length=80, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    service_description = models.TextField(blank=True)
    frame_code = models.CharField(max_length=80, blank=True)
    lens_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    consultation_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=40, blank=True)
    secondary_payment_method = models.CharField(max_length=40, blank=True)
    primary_payment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    secondary_payment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    down_payment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    installments_count = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)
    expires_at = models.DateField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["store", "status", "created_at"]),
            models.Index(fields=["store", "client"]),
        ]

    def __str__(self):
        return f"Quote #{self.pk} - {self.client}"


class Sale(TimeStampedModel):
    class WorkflowStatus(models.TextChoices):
        SOLD = "sold", "Sold"
        LAB = "lab", "Lab"
        READY = "ready", "Ready"
        DELIVERED = "delivered", "Delivered"

    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="sales")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="sales")
    quote = models.ForeignKey(Quote, on_delete=models.SET_NULL, related_name="sales", blank=True, null=True)
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.SET_NULL,
        related_name="sales",
        blank=True,
        null=True,
    )
    lab_order = models.ForeignKey(
        LabOrder,
        on_delete=models.SET_NULL,
        related_name="sales",
        blank=True,
        null=True,
    )
    legacy_id = models.CharField(max_length=80, blank=True, db_index=True)
    sale_number = models.CharField(max_length=80, blank=True)
    workflow_status = models.CharField(max_length=20, choices=WorkflowStatus.choices, default=WorkflowStatus.SOLD)
    service_description = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=40, blank=True)
    secondary_payment_method = models.CharField(max_length=40, blank=True)
    primary_payment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    secondary_payment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    down_payment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    installments_count = models.PositiveIntegerField(default=1)
    delivered_at = models.DateField(blank=True, null=True)
    delivery_notes = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["store", "sale_number"]),
            models.Index(fields=["store", "workflow_status"]),
            models.Index(fields=["store", "client"]),
        ]

    def __str__(self):
        return self.sale_number or f"Sale #{self.pk}"


class SaleItem(TimeStampedModel):
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="sale_items")
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.SET_NULL,
        related_name="sale_items",
        blank=True,
        null=True,
    )
    description = models.CharField(max_length=180)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["sale", "id"]
        indexes = [
            models.Index(fields=["store", "sale"]),
        ]

    def __str__(self):
        return self.description
