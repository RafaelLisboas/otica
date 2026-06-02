from django.conf import settings
from django.db import models

from stores.models import Store, TimeStampedModel


class UserProfile(TimeStampedModel):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super admin"
        OWNER = "owner", "Owner"
        MANAGER = "manager", "Manager"
        SELLER = "seller", "Seller"
        FINANCE = "finance", "Finance"
        STOCK = "stock", "Stock"
        LAB = "lab", "Lab"
        OPERATOR = "operator", "Operator"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.OPERATOR)
    stores = models.ManyToManyField(Store, related_name="user_profiles", blank=True)
    active_store = models.ForeignKey(
        Store,
        on_delete=models.SET_NULL,
        related_name="active_user_profiles",
        blank=True,
        null=True,
    )
    phone = models.CharField(max_length=32, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["user__username"]

    def __str__(self):
        return f"{self.user} ({self.role})"
