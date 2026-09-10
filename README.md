# Wajih Habrah — English, Arabic and Swedish portfolio

Source update, 10 September 2026 (automatic model loading and section-scroll correction). This package includes the previous portfolio refinements and adds Swedish to all five page types.

## Install

1. Extract `Wajih-Habrah-Portfolio-Update.zip` into a temporary folder.
2. Copy its contents into your existing website project folder, alongside the existing root `index.html`.
3. Merge matching folders and replace matching files. Preserve the contents of your existing `assets` folder: this download does not include your images, PDFs or 3D model.
4. Keep the `sv` folder at the website root, next to `ar`, `projects`, `education` and `assets`.
5. Preview through your usual local HTTP server. JavaScript modules in the 3D viewer require HTTP; opening the HTML through a `file://` URL is insufficient for that feature.
6. Review the language navigation and interactive features in your browser, then commit and push through your usual GitHub workflow when ready.

You can use this ZIP whether or not you already installed the previous 17-file update. If `home.css` and `model-loader.js` already exist, replace them with these versions too. There is no need to install the earlier ZIP first.

## Files included

The 23 files below are already arranged in their destination folders. “Add” refers to your portfolio before the earlier refinement package.

| Action | Relative destination |
| --- | --- |
| Replace | `README.md` |
| Replace | `ar/education/bachelors-degree/bachelors-biomedical-engineering-coursework-ar.html` |
| Replace | `ar/education/masters-degree/masters-biomedical-engineering-coursework-ar.html` |
| Replace | `ar/index.html` |
| Replace | `ar/projects/clinical-engineering-hospital-technology-ar.html` |
| Replace | `ar/projects/robotic-phantom-knee-digital-twin-ar.html` |
| Add | `assets/css/home.css` |
| Replace | `assets/css/project.css` |
| Replace | `assets/css/shared.css` |
| Replace | `assets/js/interactive-model.js` |
| Add | `assets/js/model-loader.js` |
| Replace | `assets/js/project.js` |
| Replace | `education/bachelors-degree/bachelors-biomedical-engineering-coursework.html` |
| Replace | `education/masters-degree/masters-biomedical-engineering-coursework.html` |
| Replace | `index.html` |
| Replace | `projects/clinical-engineering-hospital-technology.html` |
| Replace | `projects/robotic-phantom-knee-digital-twin.html` |
| Replace | `sitemap.xml` |
| Add | `sv/education/bachelors-degree/bachelors-biomedical-engineering-coursework-sv.html` |
| Add | `sv/education/masters-degree/masters-biomedical-engineering-coursework-sv.html` |
| Add | `sv/index.html` |
| Add | `sv/projects/clinical-engineering-hospital-technology-sv.html` |
| Add | `sv/projects/robotic-phantom-knee-digital-twin-sv.html` |

## Latest requested corrections

- The 3D model now starts downloading automatically when a thesis page opens in any of the three languages. The load button has been removed. Loading and failure handling do not move keyboard focus or scroll the page.
- The Arabic professional title is now “مهندس طبي” in the visible content, page title, social metadata and structured profile data.
- Section navigation uses one measured sticky-header offset. The duplicate section scroll margins were removed, bringing headings higher in the viewport while retaining normal section spacing. The offset updates when the navigation wraps, the mobile menu closes or the viewport changes.
- The supplied screen recording was reviewed to compare the original landing position with the manually adjusted position.

## Swedish pages

The Swedish homepage is `sv/index.html`, available at `/sv/` once published. Swedish detail pages use the `-sv.html` suffix; Arabic detail pages retain `-ar.html`. English URLs remain as before.

The five Swedish pages cover the homepage, clinical engineering at Södersjukhuset, the Robotic Phantom Knee thesis project, master's coursework and bachelor's coursework.

Each page has an EN / SV / العربية selector. The active language is indicated, and each alternative opens the corresponding page. The links work without JavaScript. The navigation accommodates the language selector on narrow screens.

Swedish content includes navigation, image descriptions, video labels, document-link labels, metadata and 3D viewer instructions, controls, loading messages and fallback messages. Authored CAD component names remain the names supplied in the existing model.

The Swedish experience text retains full-time employment in January 2018–December 2021, followed by hourly/consulting assignments on a part-time basis from January 2022 onward. It describes respiratory therapy equipment without changing that experience to ventilator servicing.

Existing PDFs, thesis publication, video and text embedded in images remain in their original languages. CV links on Swedish pages identify the existing English CV; official Chalmers syllabus links also identify English resources. Swedish course titles are descriptive translations of the supplied English content. The Swedish thesis page identifies the underlying publication as English in its structured metadata.

## Search metadata

All 15 pages include reciprocal English, Swedish and Arabic `hreflang` links, with English as `x-default`. Canonical URLs and social-preview URLs identify each page's own language version. The included `sitemap.xml` lists all 15 pages and their matching language alternatives. Replace your existing sitemap when applying this package.

Keep your existing `robots.txt` and `googlebbfc94b51f98188a.html` unchanged.

## Earlier refinements included

- Selected work appears directly below the homepage introduction.
- English, Arabic and Swedish homepages use the same structure and styling.
- The thesis page has a shorter narrative, visible results and limitations, section navigation and expandable technical explanations.
- The hospital maintenance example appears before the training catalogue and service workflow.
- Shared navigation, contrast, image sizing, skip links, dialog labels and document labels are refined.
- YouTube loads after the visitor activates the preview.
- The 3D viewer loads automatically when the project page opens, with an image fallback. It retains the existing interaction and introductory guidance, with a component selector, keyboard pan/zoom/reset, reduced-motion handling and an offscreen rendering guard.

## Existing assets required

Keep all existing images, logos, PDF documents and model files in their current paths, particularly:

- `assets/models/robotic-phantom-knee.glb`
- `assets/images/model-viewer-hand-prompt.svg`
- `assets/images/projects/robotic-phantom-knee-overview.png`
- `assets/images/projects/robotic-phantom-knee-system-architecture.png`
- `assets/images/projects/clinical-engineering-hospital-technology.jpg`
- `assets/images/wajih-habrah-profile.jpg`
- Both university logos in `assets/images/education/`
- Your CV and training PDFs in `assets/documents/`

Three.js continues to use the existing pinned jsDelivr imports. Those modules and YouTube require an internet connection.

## Validation

Passed: all 15 HTML pages, 30 cross-language navigation links, reciprocal language metadata, the 15 sitemap entries, local asset and anchor targets, JSON metadata and the three JavaScript files' syntax. Automatic model imports, success, unsupported-graphics, loading-failure and lost-context states were exercised for all three languages without a browser. Background loading preserved keyboard focus in these checks. Navigation-height updates were checked for mobile-menu closure and viewport changes; the duplicate scroll margins are absent.

A full browser or real-device check of the updated pages and interactive 3D model has not been performed. Before publishing, check the mobile menu, language switching, image enlargement, video activation and 3D controls in your normal browser.

## Maintenance

- `shared.css`: shared colors, typography, navigation, language selector, buttons and footer.
- `home.css`: all three homepages.
- `project.css`: thesis, clinical-engineering and coursework pages.
- `project.js`: mobile navigation, image dialogs and video previews.
- `model-loader.js`: automatic loading and localized loading/fallback messages.
- `interactive-model.js`: Three.js interaction and localized viewer controls.

Update corresponding English, Arabic and Swedish pages together when changing content. If a URL changes, update navigation, canonical URLs, social URLs, language alternatives and the sitemap together.
