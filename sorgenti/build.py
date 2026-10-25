"""Costruisce il simulatore in un unico file HTML.
   python3 build.py           -> ../index.html (pagina completa, per GitHub Pages)
"""
import glob, os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
files = sorted(glob.glob("data/*.js"))
bank = "\n".join(open(f, encoding="utf8").read() for f in files)
logo = open("logo.b64").read().strip()
body = (open("app.html", encoding="utf8").read()
        .replace("/*__CONFIG__*/", open("config.js", encoding="utf8").read())
        .replace("/*__BANK__*/", bank)
        .replace("/*__TOPICS__*/", open("topics.js", encoding="utf8").read())
        .replace("/*__STYLE__*/", open("style.css", encoding="utf8").read())
        .replace("/*__LOGO__*/", logo))
head = ('<!doctype html><html lang="it"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="description" content="Simulatore gratuito delle prove del semestre filtro (Chimica, Fisica, Biologia) a cura dell\'associazione studentesca ALFARMA.">'
        f'<link rel="icon" href="data:image/png;base64,{logo}"></head><body>')
out = head + body + "</body></html>"
open("../index.html", "w", encoding="utf8").write(out)
print(f"index.html creato: {len(files)} file di domande, {len(out.encode())//1024} KB")
