from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("clients", "0001_initial"),
        ("stores", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Prescription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("legacy_id", models.CharField(blank=True, db_index=True, max_length=80)),
                ("date", models.DateField()),
                ("doctor", models.CharField(blank=True, max_length=160)),
                ("crm", models.CharField(blank=True, max_length=40)),
                ("lens_type", models.CharField(blank=True, max_length=80)),
                ("lens_coloring", models.CharField(blank=True, max_length=80)),
                ("lens_material", models.CharField(blank=True, max_length=80)),
                ("lens_treatment", models.CharField(blank=True, max_length=120)),
                ("right_spherical", models.CharField(blank=True, max_length=20)),
                ("right_cylindrical", models.CharField(blank=True, max_length=20)),
                ("right_axis", models.CharField(blank=True, max_length=20)),
                ("left_spherical", models.CharField(blank=True, max_length=20)),
                ("left_cylindrical", models.CharField(blank=True, max_length=20)),
                ("left_axis", models.CharField(blank=True, max_length=20)),
                ("near_right_spherical", models.CharField(blank=True, max_length=20)),
                ("near_right_cylindrical", models.CharField(blank=True, max_length=20)),
                ("near_right_axis", models.CharField(blank=True, max_length=20)),
                ("near_left_spherical", models.CharField(blank=True, max_length=20)),
                ("near_left_cylindrical", models.CharField(blank=True, max_length=20)),
                ("near_left_axis", models.CharField(blank=True, max_length=20)),
                ("addition", models.CharField(blank=True, max_length=20)),
                ("dnp", models.CharField(blank=True, max_length=40)),
                ("co", models.CharField(blank=True, max_length=40)),
                ("film", models.CharField(blank=True, max_length=80)),
                ("dp", models.CharField(blank=True, max_length=40)),
                ("notes", models.TextField(blank=True)),
                (
                    "client",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="prescriptions", to="clients.client"),
                ),
                (
                    "store",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="prescriptions", to="stores.store"),
                ),
            ],
            options={
                "ordering": ["-date", "-created_at"],
                "indexes": [
                    models.Index(fields=["store", "client", "date"], name="prescriptio_store_i_995bd0_idx"),
                ],
            },
        ),
    ]
