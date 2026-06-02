from django.db import models

from clients.models import Client
from stores.models import Store, TimeStampedModel


class Prescription(TimeStampedModel):
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="prescriptions")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="prescriptions")
    legacy_id = models.CharField(max_length=80, blank=True, db_index=True)
    date = models.DateField()
    doctor = models.CharField(max_length=160, blank=True)
    crm = models.CharField(max_length=40, blank=True)
    lens_type = models.CharField(max_length=80, blank=True)
    lens_coloring = models.CharField(max_length=80, blank=True)
    lens_material = models.CharField(max_length=80, blank=True)
    lens_treatment = models.CharField(max_length=120, blank=True)
    right_spherical = models.CharField(max_length=20, blank=True)
    right_cylindrical = models.CharField(max_length=20, blank=True)
    right_axis = models.CharField(max_length=20, blank=True)
    left_spherical = models.CharField(max_length=20, blank=True)
    left_cylindrical = models.CharField(max_length=20, blank=True)
    left_axis = models.CharField(max_length=20, blank=True)
    near_right_spherical = models.CharField(max_length=20, blank=True)
    near_right_cylindrical = models.CharField(max_length=20, blank=True)
    near_right_axis = models.CharField(max_length=20, blank=True)
    near_left_spherical = models.CharField(max_length=20, blank=True)
    near_left_cylindrical = models.CharField(max_length=20, blank=True)
    near_left_axis = models.CharField(max_length=20, blank=True)
    addition = models.CharField(max_length=20, blank=True)
    dnp = models.CharField(max_length=40, blank=True)
    co = models.CharField(max_length=40, blank=True)
    film = models.CharField(max_length=80, blank=True)
    dp = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["store", "client", "date"]),
        ]

    def __str__(self):
        return f"{self.client} - {self.date}"
