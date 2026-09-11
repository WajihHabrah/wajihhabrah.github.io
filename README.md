# Wajih Habrah — Biomedical Engineering Portfolio

[View the live portfolio](https://wajihhabrah.github.io/)

A static, multilingual engineering portfolio presenting Wajih Habrah's work in
clinical engineering, medical technology, robotics, embedded sensing and digital
twins. The website is available in English, Swedish and Arabic and is published
with GitHub Pages.

## Portfolio content

- **Clinical engineering:** experience at Södersjukhuset in Stockholm, including
  preventive and corrective maintenance, calibration, functional testing,
  troubleshooting, technical documentation and support for clinical staff.
- **Robotic Phantom Knee and Digital Twin:** a one-degree-of-freedom research
  prototype developed as a master's thesis at Chalmers University of Technology.
  The project combines antagonistic actuation, pneumatic soft-tissue simulation,
  embedded sensing, ROS 2 and a Unity digital twin.
- **Education:** selected master's and bachelor's coursework in biomedical
  engineering, signal processing, control, rehabilitation engineering, medical
  imaging and related technical subjects.

## Languages and CVs

Each language has its own homepage, project pages, education pages and CV.

| Language | Homepage | CV file |
| --- | --- | --- |
| English | [`index.html`](index.html) | [`wajih-habrah-cv-en.pdf`](assets/documents/wajih-habrah-cv-en.pdf) |
| Swedish | [`sv/index.html`](sv/index.html) | [`wajih-habrah-cv-sv.pdf`](assets/documents/wajih-habrah-cv-sv.pdf) |
| Arabic | [`ar/index.html`](ar/index.html) | [`wajih-habrah-cv-ar.pdf`](assets/documents/wajih-habrah-cv-ar.pdf) |

The website links each language version directly to its corresponding PDF. The
CVs use the Swedish telephone number and Gothenburg location. Arabic uses the
professional title **مهندس طبي**.

## Main website features

- Responsive layouts for desktop, tablet and mobile screens.
- English, Swedish and Arabic navigation with right-to-left layout for Arabic.
- Reciprocal `hreflang` metadata, canonical URLs and a multilingual sitemap for
  all 15 HTML pages.
- Accessible skip links, keyboard navigation, visible focus states and reduced
  motion support.
- Image enlargement dialogs and video previews that load YouTube only after the
  visitor activates them.
- An interactive Three.js viewer for the Robotic Phantom Knee GLB model with
  orbit controls, component selection, exploded view, isolation, hiding,
  translation, rotation and reset controls.
- Automatic 3D-model loading with localized progress, failure and unsupported
  graphics messages.
- Mouse, touch and keyboard guidance for the 3D viewer, with a static image
  fallback when the interactive model is unavailable.

## Technology

The portfolio uses plain HTML, CSS and JavaScript. It does not require a package
manager, application framework, database or server-side runtime.

- **HTML:** semantic page structure, metadata and structured content.
- **CSS:** shared design tokens, responsive layouts and language-aware styling.
- **JavaScript:** navigation, dialogs, deferred video embedding, model loading and
  3D interaction.
- **Three.js 0.180.0:** loaded through pinned jsDelivr ES-module imports.
- **GitHub Pages:** static hosting from the repository.

## Run locally

The HTML pages can be inspected directly, but the JavaScript modules used by the
3D viewer require an HTTP server. From the repository root, run:

```sh
python -m http.server 8000
```

Then open:

- `http://localhost:8000/`
- `http://localhost:8000/sv/`
- `http://localhost:8000/ar/`

## Deployment

Commit the repository and push it to the branch configured as the GitHub Pages
publishing source. No build command is required. Preserve the directory structure
because page links and assets use relative paths.

The 3D model is approximately 17 MB and begins downloading when a thesis project
page opens. Three.js and YouTube also require an internet connection.

## CV maintenance

The three finished CVs are stored directly in `assets/documents/`:

```text
wajih-habrah-cv-en.pdf
wajih-habrah-cv-sv.pdf
wajih-habrah-cv-ar.pdf
```

When replacing a CV, keep its existing filename so all corresponding homepage
and project-page links continue to work. Update the English, Swedish and Arabic
versions together when employment dates, contact details or qualifications
change.

## Project structure

```text
wajihhabrah.github.io/
├── index.html
├── README.md
├── robots.txt
├── sitemap.xml
├── googlebbfc94b51f98188a.html
│
├── ar/
│   ├── index.html
│   ├── education/
│   │   ├── bachelors-biomedical-engineering-coursework-ar.html
│   │   └── masters-biomedical-engineering-coursework-ar.html
│   └── projects/
│       ├── clinical-engineering-hospital-technology-ar.html
│       └── robotic-phantom-knee-digital-twin-ar.html
│
├── sv/
│   ├── index.html
│   ├── education/
│   │   ├── bachelors-biomedical-engineering-coursework-sv.html
│   │   └── masters-biomedical-engineering-coursework-sv.html
│   └── projects/
│       ├── clinical-engineering-hospital-technology-sv.html
│       └── robotic-phantom-knee-digital-twin-sv.html
│
├── assets/
│   ├── css/
│   │   ├── home.css
│   │   ├── project.css
│   │   └── shared.css
│   │
│   ├── documents/
│   │   ├── wajih-habrah-cv-en.pdf
│   │   ├── wajih-habrah-cv-sv.pdf
│   │   ├── wajih-habrah-cv-ar.pdf
│   │   └── clinical-engineering/
│   │       ├── b-braun-infusion-pumps-training.pdf
│   │       ├── cardiolex-quickels-ecg-training.pdf
│   │       ├── fisher-paykel-respiratory-equipment-training.pdf
│   │       ├── mcube-biocon-700-training.pdf
│   │       ├── medical-device-safety-training.pdf
│   │       ├── philips-intellivue-monitoring-training.pdf
│   │       └── smiths-medical-patient-warming-training.pdf
│   │
│   ├── images/
│   │   ├── favicon.svg
│   │   ├── model-viewer-hand-prompt.svg
│   │   ├── wajih-habrah-portfolio-preview.png
│   │   ├── wajih-habrah-profile.jpg
│   │   ├── education/
│   │   │   ├── chalmers-university-logo.png
│   │   │   └── damascus-university-logo.png
│   │   └── projects/
│   │       ├── clinical-engineering-hospital-technology.jpg
│   │       ├── robotic-phantom-knee-overview.png
│   │       └── robotic-phantom-knee-system-architecture.png
│   │
│   ├── js/
│   │   ├── interactive-model.js
│   │   ├── model-loader.js
│   │   └── project.js
│   │
│   └── models/
│       └── robotic-phantom-knee.glb
│
├── education/
│   ├── bachelors-biomedical-engineering-coursework.html
│   └── masters-biomedical-engineering-coursework.html
│
└── projects/
    ├── clinical-engineering-hospital-technology.html
    └── robotic-phantom-knee-digital-twin.html
```

## File responsibilities

- `shared.css` controls shared colours, typography, navigation, language
  selectors, buttons and the footer.
- `home.css` controls the English, Swedish and Arabic homepages.
- `project.css` controls project, clinical-engineering and coursework pages.
- `project.js` controls mobile navigation, image dialogs and deferred video
  previews.
- `model-loader.js` controls automatic model loading and localized status or
  fallback messages.
- `interactive-model.js` controls Three.js selection, camera movement, exploded
  view, object transforms and keyboard interaction.
- `sitemap.xml` lists the 15 localized HTML URLs and their language alternatives.

When a page URL changes, update its navigation links, canonical URL, social
metadata, language alternatives and sitemap entry together.

## Existing assets

Keep all file names and relative paths stable, particularly the GLB model,
interaction-guidance SVG, project images, university logos, CVs and training
documents. The published thesis remains available through the official Chalmers
repository link used on the project pages.

## Validation

The portfolio has been checked for local page and asset references, language
navigation, reciprocal language metadata, sitemap entries, structured metadata
and JavaScript syntax. The CV update uses four verified links per language across
the corresponding homepage and project pages.

Before a major release, preview the mobile menu, language switching, image
dialogs, video activation and interactive 3D controls in a desktop and mobile
browser.
