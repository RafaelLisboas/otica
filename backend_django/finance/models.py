from django.db import models

from sales.models import Quote, Sale
from stores.models import Store, TimeStampedModel


class Installment(TimeStampedModel):
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="installments")
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="installments", blank=True, null=True)
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="installments", blank=True, null=True)
    legacy_id = models.CharField(max_length=80, blank=True, db_index=True)
    installment_number = models.PositiveIntegerField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid = models.BooleanField(default=False)
    paid_at = models.DateField(blank=True, null=True)
    payment_method = models.CharField(max_length=40, blank=True)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["due_date", "installment_number"]
        indexes = [
            models.Index(fields=["store", "due_date", "paid"]),
            models.Index(fields=["store", "sale", "installment_number"]),
            models.Index(fields=["store", "quote", "installment_number"]),
        ]

    def __str__(self):
        document = self.sale or self.quote
        return f"{document} - {self.installment_number}"
