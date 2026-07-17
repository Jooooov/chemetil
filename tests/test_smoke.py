"""Smoke tests — ChemetilSite (site estático trilingue)."""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


def test_structure():
    for p in ("index.html", "assets/styles.css", "assets/main.js", "assets/i18n.js", "requirements.txt"):
        assert os.path.exists(os.path.join(ROOT, p)), f"falta {p}"


def test_html_essentials():
    html = read("index.html")
    assert "CHEMETIL" in html
    assert "chemetil@gmail.com" in html
    assert 'id="gl"' in html  # canvas do shader
    for anchor in ("laboratorio", "acabamentos", "atelie", "contacto"):
        assert f'id="{anchor}"' in html, f"falta secção #{anchor}"
    # logotipo CH3: três H e três ligações
    assert html.count('class="hM"') == 3
    assert html.count('class="bond') == 3


def test_i18n_coverage():
    """Todas as chaves data-i18n do HTML existem em PT, EN e ES."""
    html = read("index.html")
    js = read("assets/i18n.js")
    keys = set(re.findall(r'data-i18n="([^"]+)"', html))
    assert keys, "sem chaves data-i18n"
    for lang in ("pt:", "en:", "es:"):
        assert lang in js
    for key in keys:
        occurrences = len(re.findall(rf'\b{re.escape(key)}\s*:', js))
        assert occurrences >= 3, f"chave '{key}' não traduzida nas 3 línguas (encontrada {occurrences}x)"


def test_no_secrets():
    for p in ("index.html", "assets/main.js", "assets/i18n.js"):
        content = read(p)
        assert "sk-ant" not in content and "api_key" not in content.lower()
