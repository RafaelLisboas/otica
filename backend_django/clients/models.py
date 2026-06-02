from django.db import models

from stores.models import Store, TimeStampedModel


class Client(TimeStampedModel):
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="clients")
    legacy_id = models.CharField(max_length=80, blank=True, db_index=True)
    name = models.CharField(max_length=160)
    cpf = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=32)
    email = models.EmailField(blank=True)
    birth = models.DateField(blank=True, null=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["store", "name"]),
            models.Index(fields=["store", "cpf"]),
            models.Index(fields=["store", "phone"]),
        ]

    def __str__(self):
        return self.name
