from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "active_store", "is_active")
    search_fields = ("user__username", "user__first_name", "user__last_name", "phone")
    list_filter = ("role", "is_active", "active_store")
    filter_horizontal = ("stores",)
