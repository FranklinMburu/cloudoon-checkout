"""Ask the registries whether a domain name is already registered.

RDAP is the registries' JSON lookup service, and IANA publishes which server answers
for each extension. A few country-code registries (KENIC for .ke, for example) don't
run RDAP yet, so for those we fall back to classic WHOIS on port 43.

Answers are cached for ten minutes: availability rarely changes that fast, and it
keeps us well inside the registries' rate limits while someone types.
"""

import re
import socket

import requests
from django.core.cache import caches

# Per-process memory cache: lookups run in worker threads, which must not open database connections.
cache = caches["lookups"]

RDAP_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json"
IANA_WHOIS_SERVER = "whois.iana.org"
TIMEOUT_SECONDS = 5
ANSWER_CACHE_SECONDS = 10 * 60
SERVER_LIST_CACHE_SECONDS = 24 * 60 * 60

# WHOIS has no standard "not found" reply; these cover the registries we sell.
WHOIS_NOT_FOUND = re.compile(r"no match|not found|no object found|no data found|no entries found|status:\s*free", re.I)


class RegistryUnavailableError(Exception):
    """The registry didn't give a usable answer (timeout, outage, unexpected reply)."""


def is_registered(domain: str) -> bool:
    key = f"registry:registered:{domain}"
    if (cached := cache.get(key)) is not None:
        return cached

    extension = domain.rsplit(".", 1)[-1]
    rdap_server = rdap_servers().get(extension)
    registered = _ask_rdap(rdap_server, domain) if rdap_server else _ask_whois(domain, extension)
    cache.set(key, registered, ANSWER_CACHE_SECONDS)
    return registered


def rdap_servers() -> dict[str, str]:
    """{"com": "https://rdap.verisign.com/com/v1/", ...} from IANA's bootstrap file."""
    if servers := cache.get("registry:rdap-servers"):
        return servers
    try:
        response = requests.get(RDAP_BOOTSTRAP_URL, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        services = response.json()["services"]
    except (requests.RequestException, ValueError, KeyError) as exc:
        raise RegistryUnavailableError("Couldn't load the RDAP server list.") from exc

    servers = {}
    for extensions, urls in services:
        https_urls = [url for url in urls if url.startswith("https://")] or urls
        for extension in extensions:
            servers[extension] = https_urls[0]
    cache.set("registry:rdap-servers", servers, SERVER_LIST_CACHE_SECONDS)
    return servers


def _ask_rdap(server: str, domain: str) -> bool:
    try:
        response = requests.get(
            f"{server.rstrip('/')}/domain/{domain}",
            headers={"Accept": "application/rdap+json"},
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise RegistryUnavailableError(f"RDAP lookup for {domain} failed.") from exc
    if response.status_code == 200:
        return True
    if response.status_code == 404:
        return False
    raise RegistryUnavailableError(f"RDAP returned HTTP {response.status_code} for {domain}.")


def _ask_whois(domain: str, extension: str) -> bool:
    server = _whois_server(extension)
    reply = _whois_query(server, domain)
    if WHOIS_NOT_FOUND.search(reply):
        return False
    if "domain name:" in reply.lower() or "domain:" in reply.lower():
        return True
    raise RegistryUnavailableError(f"Unrecognised WHOIS reply for {domain}.")


def _whois_server(extension: str) -> str:
    key = f"registry:whois-server:{extension}"
    if server := cache.get(key):
        return server
    match = re.search(r"^whois:\s*(\S+)", _whois_query(IANA_WHOIS_SERVER, extension), re.M)
    if not match:
        raise RegistryUnavailableError(f"No lookup service is published for .{extension}.")
    cache.set(key, match.group(1), SERVER_LIST_CACHE_SECONDS)
    return match.group(1)


def _whois_query(server: str, query: str) -> str:
    try:
        with socket.create_connection((server, 43), timeout=TIMEOUT_SECONDS) as connection:
            connection.sendall(f"{query}\r\n".encode())
            chunks = []
            while chunk := connection.recv(4096):
                chunks.append(chunk)
    except OSError as exc:
        raise RegistryUnavailableError(f"WHOIS server {server} didn't answer.") from exc
    return b"".join(chunks).decode("utf-8", errors="replace")
