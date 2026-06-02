from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("stores", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Client",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("legacy_id", models.CharField(blank=True, db_index=True, max_length=80)),
                ("name", models.CharField(max_length=160)),
                ("cpf", models.CharField(blank=True, max_length=20)),
                ("phone", models.CharField(max_length=32)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("birth", models.DateField(blank=True, null=True)),
                ("address", models.TextField(blank=True)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "store",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="clients", to="stores.store"),
                ),
            ],
            options={
                "ordering": ["name"],
                "indexes": [
                    models.Index(fields=["store", "name"], name="clients_cli_store_i_3dd954_idx"),
                    models.Index(fields=["store", "cpf"], name="clients_cli_store_i_a65b45_idx"),
                    models.Index(fields=["store", "phone"], name="clients_cli_store_i_d75b8b_idx"),
                ],
            },
        ),
    ]
