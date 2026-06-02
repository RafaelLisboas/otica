from django.conf import settings
from django.db import models

from stores.models import Store, TimeStampedModel


class StockItem(TimeStampedModel):
    class Category(models.TextChoices):
        FRAME = "frames", "Frames"
        LENS = "lenses", "Lenses"
        ACCESSORY = "accessories", "Accessories"
        SERVICE = "services", "Services"
        OTHER = "other", "Other"

    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="stock_items")
    legacy_id = models.CharField(max_length=80, blank=True, db_index=True)
    name = models.CharField(max_length=160)
    brand = models.CharField(max_length=120, blank=True)
    code = models.CharField(max_length=80, blank=True)
    category = models.CharField(max_length=32, choices=Category.choices, default=Category.OTHER)
    material = models.CharField(max_length=80, blank=True)
    color_reference = models.CharField(max_length=80, blank=True)
    quantity = models.IntegerField(default=0)
    minimum = models.IntegerField(default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["store", "name"]),
            models.Index(fields=["store", "code"]),
        ]

    def __str__(self):
        return self.name


class StockMovement(TimeStampedModel):
    class MovementType(models.TextChoices):
        IN = "in", "In"
        OUT = "out", "Out"
        ADJUSTMENT = "adjustment", "Adjustment"

    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="stock_movements")
    item = models.ForeignKey(StockItem, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.IntegerField()
    reason = models.CharField(max_length=160, blank=True)
    reference = models.CharField(max_length=120, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="stock_movements",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["store", "item", "created_at"]),
        ]

    def __str__(self):
        return f"{self.item} {self.movement_type} {self.quantity}"
