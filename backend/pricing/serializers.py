"""Shape validation for the cart. Business rules (stock, OS minimums, valid slugs) live in the engine."""

from rest_framework import serializers

from pricing.engine import CYCLES, DOMAIN_MODES, MAX_DOMAINS


class SharedSerializer(serializers.Serializer):
    plan = serializers.CharField(max_length=50)


class VpsSerializer(serializers.Serializer):
    managed = serializers.BooleanField(default=True)
    os = serializers.CharField(max_length=50)
    cpu = serializers.IntegerField(min_value=1)
    ram = serializers.IntegerField(min_value=1)
    storage = serializers.IntegerField(min_value=1)


class DedicatedSerializer(serializers.Serializer):
    server = serializers.CharField(max_length=50)
    location = serializers.CharField(max_length=50)
    bandwidth = serializers.CharField(max_length=50)


class CloudSerializer(serializers.Serializer):
    size = serializers.CharField(max_length=50)
    scaling = serializers.CharField(max_length=50)
    kubernetes = serializers.BooleanField(default=False)
    k8s_load_balancer = serializers.BooleanField(default=False)
    k8s_registry = serializers.BooleanField(default=False)


class DomainSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=253)
    mode = serializers.ChoiceField(choices=DOMAIN_MODES)
    auto_renew = serializers.BooleanField(default=True)
    privacy = serializers.BooleanField(default=True)


class AddonsSerializer(serializers.Serializer):
    backups = serializers.BooleanField(default=False)
    ssl = serializers.CharField(max_length=50, default="free")
    email_boxes = serializers.IntegerField(min_value=0, default=0)
    ddos_advanced = serializers.BooleanField(default=False)
    cdn = serializers.BooleanField(default=False)


class CartSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=["shared", "vps", "dedicated", "cloud"])
    shared = SharedSerializer(required=False)
    vps = VpsSerializer(required=False)
    dedicated = DedicatedSerializer(required=False)
    cloud = CloudSerializer(required=False)
    cycle = serializers.ChoiceField(choices=CYCLES)
    currency = serializers.CharField(max_length=3)
    country = serializers.CharField(max_length=2)
    promo_code = serializers.CharField(max_length=30, required=False, allow_null=True, allow_blank=True)
    domains = DomainSerializer(many=True, required=False, default=list)
    addons = AddonsSerializer(required=False, default=dict)

    def validate_domains(self, value):
        if len(value) > MAX_DOMAINS:
            raise serializers.ValidationError(f"You can add up to {MAX_DOMAINS} domains per order.")
        return value

    def validate(self, attrs):
        if attrs["category"] not in attrs:
            raise serializers.ValidationError(
                {attrs["category"]: "Configuration for the selected hosting type is required."}
            )
        return attrs
