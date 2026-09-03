"""
RentFlex - PWA & Favicon Package Generator
Generates full favicon packages, touch icons, Android/Chrome PWA icons, 
maskable icons with safe margins, notification badges, and a complete Web App Manifest.
"""
import os
import json
from PIL import Image

def generate_pwa_package():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, 'public')
    assets_dir = os.path.join(public_dir, 'assets')
    logo_path = os.path.join(assets_dir, 'rentflex-logo.png')

    if not os.path.exists(logo_path):
        raise FileNotFoundError(f"Source logo not found at {logo_path}")

    print(f"[PWA Asset Generator] Loading source logo from {logo_path}...")
    source_img = Image.open(logo_path).convert('RGBA')
    width, height = source_img.size
    print(f"[PWA Asset Generator] Source dimensions: {width}x{height}")

    # 1. Standard Square Icons
    icon_sizes = [
        ('favicon-16x16.png', 16),
        ('favicon-32x32.png', 32),
        ('favicon-48x48.png', 48),
        ('icon-144x144.png', 144),
        ('apple-touch-icon-152x152.png', 152),
        ('apple-touch-icon-167x167.png', 167),
        ('apple-touch-icon-180x180.png', 180),
        ('apple-touch-icon.png', 180),
        ('android-chrome-192x192.png', 192),
        ('android-chrome-512x512.png', 512),
        ('badge-72x72.png', 72),
        ('badge-96x96.png', 96),
    ]

    for filename, size in icon_sizes:
        dest_path = os.path.join(public_dir, filename)
        resized = source_img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(dest_path, format='PNG', optimize=True)
        print(f"  [OK] Generated: {filename} ({size}x{size})")

    # 2. Multi-size Favicon.ico (16, 32, 48)
    ico_path = os.path.join(public_dir, 'favicon.ico')
    ico_img_16 = source_img.resize((16, 16), Image.Resampling.LANCZOS)
    ico_img_32 = source_img.resize((32, 32), Image.Resampling.LANCZOS)
    ico_img_48 = source_img.resize((48, 48), Image.Resampling.LANCZOS)
    ico_img_48.save(
        ico_path,
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[ico_img_32, ico_img_16]
    )
    print(f"  [OK] Generated: favicon.ico (16x16, 32x32, 48x48)")

    # 3. Maskable Icons (safe zone margin: 15% padding on each side, black background)
    maskable_sizes = [
        ('maskable-icon-192x192.png', 192),
        ('maskable-icon-512x512.png', 512),
    ]

    for filename, size in maskable_sizes:
        dest_path = os.path.join(public_dir, filename)
        # Background canvas in deep black (#09090b / #000000)
        canvas = Image.new('RGBA', (size, size), (9, 9, 11, 255))
        # Inner logo scaled to 75% of canvas to fit within the Android maskable safe circle
        inner_size = int(size * 0.75)
        inner_logo = source_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = (size - inner_size) // 2
        canvas.paste(inner_logo, (offset, offset), inner_logo if inner_logo.mode == 'RGBA' else None)
        canvas.save(dest_path, format='PNG', optimize=True)
        print(f"  [OK] Generated: {filename} (Maskable {size}x{size})")

    # 4. Web App Manifest Generation
    manifest = {
        "id": "/",
        "name": "RentFlex - Smart Property & Lease Management",
        "short_name": "RentFlex",
        "description": "Next-Generation South African PropTech & Escrow Platform. Seamless rentals, transparent leases, automated BNPL deposits, and smart contractor coordination.",
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "orientation": "portrait-primary",
        "background_color": "#ffffff",
        "theme_color": "#09090b",
        "lang": "en",
        "categories": ["business", "finance", "productivity", "utilities"],
        "icons": [
            {
                "src": "/favicon-16x16.png",
                "sizes": "16x16",
                "type": "image/png"
            },
            {
                "src": "/favicon-32x32.png",
                "sizes": "32x32",
                "type": "image/png"
            },
            {
                "src": "/apple-touch-icon.png",
                "sizes": "180x180",
                "type": "image/png"
            },
            {
                "src": "/android-chrome-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/maskable-icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable"
            },
            {
                "src": "/android-chrome-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/maskable-icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable"
            }
        ],
        "shortcuts": [
            {
                "name": "Properties",
                "short_name": "Properties",
                "description": "Browse verified rental listings",
                "url": "/Properties",
                "icons": [{ "src": "/android-chrome-192x192.png", "sizes": "192x192" }]
            },
            {
                "name": "Payments & Escrow",
                "short_name": "Payments",
                "description": "Manage monthly rent and deposit escrow",
                "url": "/Payments",
                "icons": [{ "src": "/android-chrome-192x192.png", "sizes": "192x192" }]
            },
            {
                "name": "My Leases",
                "short_name": "Leases",
                "description": "Review digital lease agreements",
                "url": "/Leases",
                "icons": [{ "src": "/android-chrome-192x192.png", "sizes": "192x192" }]
            }
        ],
        "prefer_related_applications": False
    }

    manifest_path = os.path.join(public_dir, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f"  [OK] Updated: manifest.json with full PWA specification")

    # 5. Also sync to dist if dist exists
    dist_dir = os.path.join(base_dir, 'dist')
    if os.path.exists(dist_dir):
        import shutil
        for filename, _ in icon_sizes + maskable_sizes:
            src = os.path.join(public_dir, filename)
            dst = os.path.join(dist_dir, filename)
            shutil.copy2(src, dst)
        shutil.copy2(ico_path, os.path.join(dist_dir, 'favicon.ico'))
        shutil.copy2(manifest_path, os.path.join(dist_dir, 'manifest.json'))
        print(f"  [OK] Synced generated PWA assets to dist/ directory")

    print("\n[PWA Asset Generator] Successfully generated all favicon packages and Web Manifest!")

if __name__ == '__main__':
    generate_pwa_package()
