"""Unpack the personally licensed wordmark font for local use."""
from pathlib import Path
from zipfile import ZipFile

assets = Path(__file__).resolve().parent.parent / 'dist' / 'assets'
with ZipFile(assets / 'agraham-original.zip') as archive:
    font = archive.read('Agraham.otf')
destination = assets / 'agraham-regular.otf'
if not destination.exists() or destination.read_bytes() != font:
    destination.write_bytes(font)
print('Agraham wordmark font is ready for personal use.')
