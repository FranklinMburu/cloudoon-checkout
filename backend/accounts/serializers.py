from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


def user_payload(user, provider: str) -> dict:
    return {"name": user.get_full_name() or user.email, "email": user.email, "provider": provider}


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("An account with this email already exists. Log in instead.")
        return value

    def validate(self, attrs):
        first, _, last = attrs.get("full_name", "").strip().partition(" ")
        candidate = User(username=attrs["email"], email=attrs["email"], first_name=first, last_name=last)
        validate_password(attrs["password"], user=candidate)  # Django's validators: length, common, numeric, similarity
        attrs["user"] = candidate
        return attrs

    def create(self, validated_data):
        user = validated_data["user"]
        user.set_password(validated_data["password"])  # PBKDF2 hash; the raw password is never stored
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
