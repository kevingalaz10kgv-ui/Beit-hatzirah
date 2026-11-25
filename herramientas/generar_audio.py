#!/usr/bin/env python3
"""
BEIT HATZIRAH — Generador de audio con voz neuronal (OpenAI, la tecnología de voz de ChatGPT)

Crea un archivo MP3 por pasuq y registra todo en data/audio/indice.json.
La app usa esos audios automáticamente, sincronizados versículo por versículo.

Uso básico (desde la carpeta del proyecto):
    pip install requests mutagen
    export OPENAI_API_KEY="tu-clave"          (Windows: set OPENAI_API_KEY=tu-clave)
    python herramientas/generar_audio.py --prueba
    python herramientas/generar_audio.py --idioma he --libros torah

Si se interrumpe, vuelve a ejecutarlo: continúa donde quedó (no repite pasuqim ya generados).
"""
import argparse, json, os, re, sys, time

TORAH = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU']
URL = 'https://api.openai.com/v1/audio/speech'
INSTR = {
    'he': ('Voice: a native Israeli man with a warm, deep voice. Read this Biblical Hebrew text aloud with clear, natural '
           'modern Israeli pronunciation, following the vowel points (niqqud) exactly. Pace: calm, unhurried and reverent, '
           'with a brief pause at the end. Do not translate, explain or add any words.'),
    'es': ('Voz: un hombre de voz cálida y grave. Lee este texto bíblico en español latinoamericano neutro, con ritmo '
           'pausado y tono reverente. Pronuncia a la manera hebrea los nombres Elohim, YAH, Yahshúa, Mashíaj y '
           'Ruaj HaKodesh. No traduzcas, no expliques y no agregues palabras.')
}

# ---------- Preparación del texto (igual que en la app) ----------
TEAM = re.compile('[\u0591-\u05AF\u05BD\u05C0\u034F]')
NAME = re.compile('י[\u05B0-\u05C7]*ה[\u05B0-\u05C7]*ו[\u05B0-\u05C7]*ה[\u05B0-\u05C7]*')
def heb_speech(h):
    h = TEAM.sub('', h)
    h = NAME.sub('יָהּ', h)   # el Nombre se lee «YAH»
    return re.sub(r'\s+', ' ', h.replace('\u05BE', ' ').replace('\u05C3', '.')).strip()
L = r'[^\W\d_]'
NB, NE = r'(^|(?<!' + L + r')(?<!ʼ))', r'(?!' + L + r')'
def _rx(w): return re.compile(r'(?<![^\W\d_ʼ])(' + w + r')(?![^\W\d_])')
NOMBRES = [('Jesucristo', 'Yahshúa HaMashíaj'), ('Jesús', 'Yahshúa'), ('Cristos', 'Mashíaj'), ('Cristo', 'Mashíaj'),
           ('Espíritu Santo', 'Ruaj HaKodesh'), ('Jehová', 'YAH'), ('Yahvé', 'YAH'), ('YAVÉ', 'YAH'), ('Yavé', 'YAH'), ('Jesu', 'Yahshúa'), ('Yah', 'YAH'), ('JAH', 'YAH'), ('Jah', 'YAH'), ('YA', 'YAH'), ('Aleluya', 'AleluYAH'),
           ('ʼElohim', 'Elohim'), ('ʼAdonay', 'Adonay'), ('ʼEL', 'El'), ('ʼEl', 'El'), ('Dios', 'Elohim')]
DIVINO = re.compile(r'(?<![^\W\d_ʼ])(?:(el|del|al) )?(?:Señor|ʼAdonay) (?:Jehová|Yahvé|YAVÉ|Yavé)(?![^\W\d_])')
ART = re.compile(r'(?<![^\W\d_ʼ])(el|del|al) (ʼAdonay|Jehová|Yahvé|YAVÉ|Yavé)(?![^\W\d_])')
def es_speech(t, nombres=True):
    if nombres:
        art = lambda a: 'de ' if a == 'del' else 'a ' if a == 'al' else ''
        t = DIVINO.sub(lambda m: art(m.group(1)) + 'Adonay YAH', t)
        t = re.sub(r'(?<![^\W\d_ʼ])(?:Jehová|Yahvé|YAVÉ|Yavé) de (?:los ejércitos|las huestes)(?![^\W\d_])', 'YAH Tzevaot', t)
        t = ART.sub(lambda m: art(m.group(1)) + 'YAH', t)
        for a, b in NOMBRES: t = _rx(re.escape(a)).sub(b, t)
    return re.sub(r'\s+', ' ', t.replace('ʼ', '')).strip()

# ---------- Utilidades ----------
def load_books(root):
    s = open(os.path.join(root, 'js', 'books.js'), encoding='utf-8').read()
    return json.loads(s[s.index('=') + 1:].rstrip().rstrip(';'))
def chapters(root, code, lang, trad):
    base = json.load(open(os.path.join(root, 'data', 'b', code + '.json'), encoding='utf-8'))['c']
    if lang == 'es' and trad != 'rv':
        tr = json.load(open(os.path.join(root, 'data', 'es', trad, code + '.json'), encoding='utf-8'))['c']
        return [[(tr[ci][vi] if ci < len(tr) and vi < len(tr[ci]) else '') for vi in range(len(ch))] for ci, ch in enumerate(base)]
    return [[(cell[1] if len(cell) > 1 else '') if lang == 'he' else cell[0] for cell in ch] for ch in base]
def text_for(raw, lang, nombres):
    if not raw or raw == '^': return ''
    return heb_speech(raw) if lang == 'he' else es_speech(raw, nombres)

def tts(text, args, key, path):
    import requests
    if os.environ.get('BH_MOCK'):   # solo para pruebas internas
        os.system(f'ffmpeg -loglevel error -y -f lavfi -i anullsrc=r=24000:cl=mono -t {max(0.6, len(text) / 14):.2f} -q:a 9 "{path}"'); return
    body = {'model': args.modelo, 'voice': args.voz, 'input': text, 'response_format': 'mp3'}
    if args.modelo.startswith('gpt-4o'): body['instructions'] = INSTR[args.idioma]
    for intento in range(6):
        r = requests.post(URL, headers={'Authorization': 'Bearer ' + key}, json=body, timeout=120)
        if r.status_code == 200:
            open(path, 'wb').write(r.content); return
        if r.status_code in (429, 500, 502, 503, 504):
            espera = 2 ** intento * 3; print(f'   servicio ocupado ({r.status_code}); reintento en {espera} s'); time.sleep(espera); continue
        sys.exit(f'Error de OpenAI ({r.status_code}): {r.text[:300]}')
    sys.exit('OpenAI no respondió después de varios intentos. Vuelve a ejecutar el programa más tarde.')

def duration(path):
    from mutagen.mp3 import MP3
    return round(MP3(path).info.length, 2)

def main():
    ap = argparse.ArgumentParser(description='Genera el audio de Beit Hatzirah con voz neuronal masculina.')
    ap.add_argument('--idioma', choices=['he', 'es'], default='he')
    ap.add_argument('--libros', default='torah', help='torah, tanaj, todo, o códigos separados por coma (GEN,EXO)')
    ap.add_argument('--voz', default='onyx', help='voz de OpenAI (masculinas: onyx, ash, echo)')
    ap.add_argument('--modelo', default='gpt-4o-mini-tts', help='gpt-4o-mini-tts (recomendado), tts-1-hd o tts-1')
    ap.add_argument('--traduccion', choices=['pdt', 'blm', 'rv'], default='pdt', help='traducción para el español')
    ap.add_argument('--sin-nombres-hebreos', action='store_true', help='leer el español sin adaptar los nombres')
    ap.add_argument('--prueba', action='store_true', help='genera solo Bereshit 1:1-3 para escuchar antes de todo')
    ap.add_argument('--si', action='store_true', help='no pedir confirmación')
    args = ap.parse_args()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    key = os.environ.get('OPENAI_API_KEY', '')
    if not key and not os.environ.get('BH_MOCK'): sys.exit('Falta la clave: define la variable OPENAI_API_KEY (ver instrucciones).')
    books = load_books(root)
    codes = {'torah': TORAH, 'tanaj': [b['c'] for b in books[:39]], 'todo': [b['c'] for b in books]}.get(args.libros, [x.strip().upper() for x in args.libros.split(',')])
    if args.idioma == 'he' and args.libros == 'todo': print('Nota: el hebreo del Brit Hadashá no tiene vocales; la voz lo leerá tal como está escrito.')
    nombres = not args.sin_nombres_hebreos
    trabajo = []
    for code in (['GEN'] if args.prueba else codes):
        chs = chapters(root, code, args.idioma, args.traduccion)
        for ci, ch in enumerate(chs[:1] if args.prueba else chs):
            for vi, raw in enumerate(ch[:3] if args.prueba else ch):
                trabajo.append((code, ci + 1, vi + 1, text_for(raw, args.idioma, nombres), len(ch)))
    chars = sum(len(t) for *_, t, _ in trabajo)
    minutos = chars / (11 if args.idioma == 'he' else 14) / 60
    precio = {'tts-1': chars / 1e6 * 15, 'tts-1-hd': chars / 1e6 * 30}.get(args.modelo, minutos * 0.015)
    print(f'Libros: {", ".join(["GEN 1:1-3"] if args.prueba else codes)} | idioma: {args.idioma} | voz: {args.voz} | modelo: {args.modelo}')
    print(f'Pasuqim: {len(trabajo)} | caracteres: {chars:,} | audio estimado: {minutos / 60:.1f} horas | espacio aprox.: {minutos * 0.5:.0f} MB')
    print(f'Costo aproximado en OpenAI: US$ {precio:.2f} (estimación; verifica los precios actuales en https://openai.com/api/pricing)')
    if not args.si and input('¿Continuar? (s/n): ').strip().lower() not in ('s', 'si', 'sí', 'y'): return
    idx_path = os.path.join(root, 'data', 'audio', 'indice.json')
    idx = json.load(open(idx_path, encoding='utf-8')) if os.path.exists(idx_path) else {}
    voz_label = 'Voz neuronal masculina (' + args.voz + ')'
    hechos = 0
    for code, c, v, text, n in trabajo:
        key_ch = f'{code}-{c}'
        ent = idx.setdefault(args.idioma, {}).setdefault(key_ch, {'voz': voz_label, 'v': [None] * n})
        if len(ent['v']) < n: ent['v'] += [None] * (n - len(ent['v']))
        rel = f'data/audio/{args.idioma}/{code}/{c}/{v}.mp3'; path = os.path.join(root, rel)
        if text and not (ent['v'][v - 1] and os.path.exists(path)):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            tts(text, args, key, path)
            ent['v'][v - 1] = {'s': rel, 'd': duration(path)}
            hechos += 1
            if hechos % 20 == 0 or v == n:
                json.dump(idx, open(idx_path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
                print(f'  {code} {c}:{v}  ({hechos} pasuqim nuevos)')
    json.dump(idx, open(idx_path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'Listo: {hechos} pasuqim generados. Sube la carpeta data/audio y el archivo data/audio/indice.json a GitHub.')

if __name__ == '__main__':
    main()
