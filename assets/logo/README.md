# Fit — logo & brand mark

The mark is a bold **“F”** whose middle stroke is a **coral dumbbell**, set on the app's
purple gradient. It reuses the existing brand palette so it matches the UI out of the box.

| Color | Hex | Use |
|-------|-----|-----|
| Purple (primary) | `#6C56D9` → `#8E78F0` | icon gradient, mark on light bg |
| Coral (accent) | `#FF6B7A` | dumbbell / energy accent |
| Ink | `#231F20` | wordmark |
| Muted | `#8C868A` | tagline |

## Files

| File | What it is |
|------|------------|
| `fit-icon.svg` | App icon — gradient squircle + white mark. **Source for icon.png** |
| `fit-mark.svg` | Mark only (purple F / coral dumbbell), transparent — for light UI |
| `fit-mark-mono.svg` | Single-color mark (`currentColor`) — Android monochrome, tinting |
| `fit-logo-horizontal.svg` | Mark + “Fit” wordmark + tagline — headers, splash, README |
| `fit-adaptive-foreground.svg` | Android adaptive foreground (white mark, safe zone) |
| `fit-adaptive-background.svg` | Android adaptive background (gradient) |
| `preview.html` | Open in a browser to see every variant on light/dark/brand |

## Preview

Open `assets/logo/preview.html` in any browser (or right-click the `.svg` files in
VS Code → *Open Preview*).

## Exporting PNGs for Expo

Expo's `app.json` points at PNGs, not SVGs. Generate them from these sources, e.g. with
[`sharp-cli`](https://www.npmjs.com/package/sharp-cli):

```bash
# app icon (1024×1024)
npx --yes sharp-cli -i assets/logo/fit-icon.svg -o assets/images/icon.png resize 1024 1024
# Android adaptive layers
npx --yes sharp-cli -i assets/logo/fit-adaptive-foreground.svg -o assets/images/android-icon-foreground.png resize 1024 1024
npx --yes sharp-cli -i assets/logo/fit-adaptive-background.svg  -o assets/images/android-icon-background.png  resize 1024 1024
npx --yes sharp-cli -i assets/logo/fit-mark-mono.svg -o assets/images/android-icon-monochrome.png resize 1024 1024
# splash + favicon
npx --yes sharp-cli -i assets/logo/fit-mark.svg -o assets/images/splash-icon.png resize 400 400 --fit contain --background "#ffffff00"
npx --yes sharp-cli -i assets/logo/fit-icon.svg -o assets/images/favicon.png resize 48 48
```

Then keep the gradient behind the Android icon by setting in `app.json`:
`android.adaptiveIcon.backgroundColor` → `"#6C56D9"`.

> The wordmark uses Poppins (falls back to Segoe UI). For a locked-down logo file,
> convert the `<text>` to outlines in a vector editor before shipping.
