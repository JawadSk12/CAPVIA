import magic
try:
    print(f"Magic version: {magic.__file__}")
    m = magic.from_buffer(b"%PDF-1.5", mime=True)
    print(f"Detected MIME: {m}")
except Exception as e:
    print(f"Magic failed: {e}")
