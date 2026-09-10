// Download the Three.js viewer and model automatically when the page opens.
const modelHost = document.getElementById("interactive-model");
const modelIntro = document.getElementById("model-intro");
const retryButton = document.getElementById("retry-model");
const modelMessage = document.getElementById("model-message");
const toolbar = document.querySelector(".model-toolbar");
const loading = document.getElementById("model-loading");
const isArabic = document.documentElement.lang.toLowerCase().startsWith("ar");
const isSwedish = document.documentElement.lang.toLowerCase().startsWith("sv");

if (modelHost && modelIntro && modelMessage) {
  const text = isArabic ? {
    loading: "جارٍ تحميل النموذج ثلاثي الأبعاد…",
    unavailable: "العرض التفاعلي غير متاح في هذا المتصفح. يمكنك استعراض الصورة أو مشاهدة العرض العملي أعلاه.",
    failed: "تعذّر تحميل العرض التفاعلي. يمكنك إعادة المحاولة أو استعراض الصورة والعرض العملي.",
  } : isSwedish ? {
    loading: "Laddar 3D-modellen…",
    unavailable: "Den interaktiva visningen är inte tillgänglig i den här webbläsaren. Du kan utforska bilden eller se demonstrationen ovan.",
    failed: "Det gick inte att ladda den interaktiva visningen. Försök igen eller använd bilden och projektdemonstrationen.",
  } : {
    loading: "Loading 3D model…",
    unavailable: "The interactive view is unavailable in this browser. You can explore the image or watch the demonstration above.",
    failed: "The interactive view could not be loaded. Try again, or use the image and project demonstration.",
  };
  let timer;
  let started = false;

  function fallback(message) {
    clearTimeout(timer);
    modelHost.hidden = true;
    if (toolbar) toolbar.hidden = true;
    if (loading) loading.hidden = true;
    modelIntro.hidden = false;
    modelMessage.textContent = message;
    if (retryButton) retryButton.hidden = !started;
  }

  function supportsGraphics() {
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2");
      if (!gl) return false;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  }

  modelHost.addEventListener("model-ready", () => {
    clearTimeout(timer);
    modelIntro.hidden = true;
    modelHost.hidden = false;
    if (toolbar) toolbar.hidden = false;
    if (loading) loading.hidden = true;
    // Background loading must not move the reader's keyboard focus or scroll.
  });
  modelHost.addEventListener("model-error", () => fallback(text.failed));
  retryButton?.addEventListener("click", () => window.location.reload());

  async function startModel() {
    if (!supportsGraphics()) {
      fallback(text.unavailable);
      return;
    }
    started = true;
    modelIntro.hidden = true;
    modelHost.hidden = false;
    if (toolbar) toolbar.hidden = false;
    if (loading) {
      loading.hidden = false;
      loading.textContent = text.loading;
    }
    timer = setTimeout(() => fallback(text.failed), 90000);
    try {
      await import("./interactive-model.js");
    } catch (error) {
      console.warn("Unable to start the model viewer.", error);
      fallback(text.failed);
    }
  }

  void startModel();
}
