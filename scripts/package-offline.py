"""Produce a standalone, dependency free HTML edition of One Card."""
from pathlib import Path
import base64
import re
import runpy
from zipfile import ZipFile, ZIP_DEFLATED

project = Path(__file__).resolve().parent.parent
runpy.run_path(str(project / 'scripts' / 'prepare-font.py'))
dist = project / 'dist'
html = (dist / 'index.html').read_text()
css = (dist / 'styles.css').read_text()
for filename in ['manrope-regular.ttf', 'manrope-semibold.ttf', 'manrope-bold.ttf', 'agraham-regular.otf']:
    encoded = base64.b64encode((dist / 'assets' / filename).read_bytes()).decode()
    mime = 'font/otf' if filename.endswith('.otf') else 'font/ttf'
    css = css.replace(f'assets/{filename}', f'data:{mime};base64,{encoded}')
favicon = base64.b64encode((dist / 'assets/favicon.svg').read_bytes()).decode()
html = html.replace('href="assets/favicon.svg"', f'href="data:image/svg+xml;base64,{favicon}"')
html = re.sub(r'  <link rel="preload"[^>]+>\n', '', html)
html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>{css}</style>')
engine = re.sub(r'\bexport ', '', (dist / 'game.js').read_text())
app = re.sub(r'^import .*?;\n', '', (dist / 'app.js').read_text(), count=1)
def module_url(source):
    return 'data:text/javascript;base64,' + base64.b64encode(source.encode()).decode()

core_url = module_url((dist / 'vendor/three.core.js').read_text())
three_source = (dist / 'vendor/three.module.js').read_text().replace('./three.core.js', core_url)
three_url = module_url(three_source)
scene_source = (dist / 'scene.js').read_text().replace('./vendor/three.module.js', three_url)
app = app.replace('./scene.js', module_url(scene_source))
html = html.replace('<script type="module" src="app.js"></script>', f'<script type="module">\n{engine}\n{app}\n</script>')
license_text = '\n\n'.join((dist / name).read_text() for name in ['assets/MANROPE-LICENSE.txt', 'assets/AGRAHAM-LICENSE.txt', 'vendor/THREE-LICENSE.txt']).replace('--', '—')
html = html.replace('</html>', f'<!-- Font and Three.js licenses\n{license_text}\n-->\n</html>')
exports = project / 'exports'
exports.mkdir(exist_ok=True)
destination = exports / 'one-card-poker.html'
destination.write_text(html)
print(f'Standalone game: {destination} ({destination.stat().st_size:,} bytes)')

# Distribute the font only as its original ZIP. The local standalone edition
# contains the extracted personal-use font and therefore stays out of Git/ZIPs.
archive_path = exports / 'one-card-poker-source.zip'
excluded = {'.git', '.openai', 'exports', 'work', 'node_modules', '__pycache__'}
with ZipFile(archive_path, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(project.rglob('*')):
        relative = path.relative_to(project)
        if not path.is_file() or excluded.intersection(relative.parts):
            continue
        if relative.as_posix() == 'dist/assets/agraham-regular.otf' or path.name == '.DS_Store' or path.name.startswith('.env'):
            continue
        archive.write(path, Path('one-card-poker') / relative)
print(f'Source archive: {archive_path} ({archive_path.stat().st_size:,} bytes)')
