from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("stores", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="StockItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("legacy_id", models.CharField(blank=True, db_index=True, max_length=80)),
                ("name", models.CharField(max_length=160)),
                ("brand", models.CharField(blank=True, max_length=120)),
                ("code", models.CharField(blank=True, max_length=80)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("frames", "Frames"),
                            ("lenses", "Lenses"),
                            ("accessories", "Accessories"),
                            ("services", "Services"),
                            ("other", "Other"),
                        ],
                        default="other",
                        max_length=32,
                    ),
                ),
                ("material", models.CharField(blank=True, max_length=80)),
                ("color_reference", models.CharField(blank=True, max_length=80)),
                ("quantity", models.IntegerField(default=0)),
                ("minimum", models.IntegerField(default=0)),
                ("cost", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "store",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="stock_items", to="stores.store"),
                ),
            ],
            options={
                "ordering": ["name"],
                "indexes": [
                    models.Index(fields=["store", "name"], name="stock_stock_store_i_ba6524_idx"),
                    models.Index(fields=["store", "code"], name="stock_stock_store_i_de61c8_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="StockMovement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "movement_type",
                    models.CharField(choices=[("in", "In"), ("out", "Out"), ("adjustment", "Adjustment")], max_length=20),
                ),
                ("quantity", models.IntegerField()),
                ("reason", models.CharField(blank=True, max_length=160)),
                ("reference", models.CharField(blank=True, max_length=120)),
                (
                    "item",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="movements", to="stock.stockitem"),
                ),
                (
                    "store",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="stock_movements", to="stores.store"),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="stock_movements",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["store", "item", "created_at"], name="stock_stock_store_i_ad8c7d_idx"),
                ],
            },
        ),
    ]
