from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("sales", "0001_initial"),
        ("stores", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Installment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("legacy_id", models.CharField(blank=True, db_index=True, max_length=80)),
                ("installment_number", models.PositiveIntegerField()),
                ("due_date", models.DateField()),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("paid", models.BooleanField(default=False)),
                ("paid_at", models.DateField(blank=True, null=True)),
                ("payment_method", models.CharField(blank=True, max_length=40)),
                ("paid_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("notes", models.TextField(blank=True)),
                (
                    "sale",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="installments",
                        to="sales.sale",
                    ),
                ),
                (
                    "quote",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="installments",
                        to="sales.quote",
                    ),
                ),
                (
                    "store",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="installments", to="stores.store"),
                ),
            ],
            options={
                "ordering": ["due_date", "installment_number"],
                "indexes": [
                    models.Index(fields=["store", "due_date", "paid"], name="finance_ins_store_i_67ffad_idx"),
                    models.Index(fields=["store", "sale", "installment_number"], name="finance_ins_store_i_42373e_idx"),
                    models.Index(fields=["store", "quote", "installment_number"], name="finance_ins_store_i_50e147_idx"),
                ],
            },
        ),
    ]
