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
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("super_admin", "Super admin"),
                            ("owner", "Owner"),
                            ("manager", "Manager"),
                            ("seller", "Seller"),
                            ("finance", "Finance"),
                            ("stock", "Stock"),
                            ("lab", "Lab"),
                            ("operator", "Operator"),
                        ],
                        default="operator",
                        max_length=32,
                    ),
                ),
                ("phone", models.CharField(blank=True, max_length=32)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "active_store",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="active_user_profiles",
                        to="stores.store",
                    ),
                ),
                (
                    "stores",
                    models.ManyToManyField(blank=True, related_name="user_profiles", to="stores.store"),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["user__username"],
            },
        ),
    ]
