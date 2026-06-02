from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("clients", "0001_initial"),
        ("lab_orders", "0001_initial"),
        ("prescriptions", "0001_initial"),
        ("stock", "0001_initial"),
        ("stores", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Quote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("legacy_id", models.CharField(blank=True, db_index=True, max_length=80)),
                (
                    "status",
                    models.CharField(
                        choices=[("open", "Open"), ("approved", "Approved"), ("rejected", "Rejected"), ("expired", "Expired")],
                        default="open",
                        max_length=20,
                    ),
                ),
                ("service_description", models.TextField(blank=True)),
                ("frame_code", models.CharField(blank=True, max_length=80)),
                ("lens_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("consultation_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("payment_method", models.CharField(blank=True, max_length=40)),
                ("secondary_payment_method", models.CharField(blank=True, max_length=40)),
                ("primary_payment_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("secondary_payment_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("down_payment", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("installments_count", models.PositiveIntegerField(default=1)),
                ("notes", models.TextField(blank=True)),
                ("expires_at", models.DateField(blank=True, null=True)),
                (
                    "client",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="quotes", to="clients.client"),
                ),
                (
                    "lab_order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="quotes",
                        to="lab_orders.laborder",
                    ),
                ),
                (
                    "prescription",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="quotes",
                        to="prescriptions.prescription",
                    ),
                ),
                (
                    "store",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="quotes", to="stores.store"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["store", "status", "created_at"], name="sales_quote_store_i_596c11_idx"),
                    models.Index(fields=["store", "client"], name="sales_quote_store_i_5d875d_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="Sale",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("legacy_id", models.CharField(blank=True, db_index=True, max_length=80)),
                ("sale_number", models.CharField(blank=True, max_length=80)),
                (
                    "workflow_status",
                    models.CharField(
                        choices=[("sold", "Sold"), ("lab", "Lab"), ("ready", "Ready"), ("delivered", "Delivered")],
                        default="sold",
                        max_length=20,
                    ),
                ),
                ("service_description", models.TextField(blank=True)),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("payment_method", models.CharField(blank=True, max_length=40)),
                ("secondary_payment_method", models.CharField(blank=True, max_length=40)),
                ("primary_payment_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("secondary_payment_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("down_payment", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("installments_count", models.PositiveIntegerField(default=1)),
                ("delivered_at", models.DateField(blank=True, null=True)),
                ("delivery_notes", models.TextField(blank=True)),
                ("notes", models.TextField(blank=True)),
                (
                    "client",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="sales", to="clients.client"),
                ),
                (
                    "lab_order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sales",
                        to="lab_orders.laborder",
                    ),
                ),
                (
                    "prescription",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sales",
                        to="prescriptions.prescription",
                    ),
                ),
                (
                    "quote",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sales",
                        to="sales.quote",
                    ),
                ),
                (
                    "store",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="sales", to="stores.store"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["store", "sale_number"], name="sales_sale_store_i_41a026_idx"),
                    models.Index(fields=["store", "workflow_status"], name="sales_sale_store_i_6c8c40_idx"),
                    models.Index(fields=["store", "client"], name="sales_sale_store_i_68ac70_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="SaleItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("description", models.CharField(max_length=180)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("unit_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("total_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                (
                    "sale",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="sales.sale"),
                ),
                (
                    "stock_item",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sale_items",
                        to="stock.stockitem",
                    ),
                ),
                (
                    "store",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="sale_items", to="stores.store"),
                ),
            ],
            options={
                "ordering": ["sale", "id"],
                "indexes": [
                    models.Index(fields=["store", "sale"], name="sales_salei_store_i_e2de54_idx"),
                ],
            },
        ),
    ]
