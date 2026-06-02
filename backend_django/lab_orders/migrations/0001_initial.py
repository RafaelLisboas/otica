from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("clients", "0001_initial"),
        ("prescriptions", "0001_initial"),
        ("stores", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="LabOrder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("legacy_id", models.CharField(blank=True, db_index=True, max_length=80)),
                ("order_number", models.CharField(max_length=80)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("sent", "Sent"),
                            ("lab", "Lab"),
                            ("ready", "Ready"),
                            ("returned", "Returned"),
                            ("delivered", "Delivered"),
                        ],
                        default="sent",
                        max_length=20,
                    ),
                ),
                ("laboratory", models.CharField(blank=True, max_length=120)),
                ("expected_at", models.DateField(blank=True, null=True)),
                ("returned_at", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("snapshot", models.JSONField(blank=True, default=dict)),
                (
                    "client",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lab_orders", to="clients.client"),
                ),
                (
                    "prescription",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="lab_orders",
                        to="prescriptions.prescription",
                    ),
                ),
                (
                    "store",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lab_orders", to="stores.store"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["store", "order_number"], name="lab_orders__store_i_68566c_idx"),
                    models.Index(fields=["store", "status"], name="lab_orders__store_i_d87bd7_idx"),
                ],
                "unique_together": {("store", "order_number")},
            },
        ),
    ]
