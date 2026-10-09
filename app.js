(() => {
  const $ = (id) => document.getElementById(id);
  const input = $("imageInput");
  if (!input) return;
  const settings = $("settings"), status = $("status"), quality = $("quality");
  const format = $("format"), maxWidth = $("maxWidth"), maxHeight = $("maxHeight");
  const compressBtn = $("compressBtn"), resetBtn = $("resetBtn"), results = $("results");
  let originalFile = null, originalURL = null, outputURL = null, outputBlob = null;
  const bytes = (n) => {
    if (!Number.isFinite(n)) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  };
  const cleanURL = (url) => { if (url) URL.revokeObjectURL(url); };
  quality?.addEventListener("input", () => $("qualityValue").textContent = `${quality.value}%`);
  input.addEventListener("change", () => {
    clearResult();
    originalFile = input.files && input.files[0] ? input.files[0] : null;
    if (!originalFile) { settings.hidden = true; status.textContent = "Choose an image to begin."; return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(originalFile.type)) {
      originalFile = null; settings.hidden = true;
      status.textContent = "Please choose a JPG, PNG or WebP image."; return;
    }
    if (originalFile.size > 25 * 1024 * 1024) {
      originalFile = null; settings.hidden = true;
      status.textContent = "This demo limits files to 25 MB to reduce browser memory problems."; return;
    }
    originalURL = URL.createObjectURL(originalFile);
    $("originalPreview").src = originalURL;
    $("originalSize").textContent = bytes(originalFile.size);
    const img = new Image();
    img.onload = () => {
      maxWidth.placeholder = `Original: ${img.naturalWidth}px`;
      maxHeight.placeholder = `Original: ${img.naturalHeight}px`;
      status.textContent = `Selected: ${originalFile.name} (${img.naturalWidth} × ${img.naturalHeight}px, ${bytes(originalFile.size)}).`;
      settings.hidden = false;
    };
    img.onerror = () => { settings.hidden = true; status.textContent = "The browser could not read this image. Try another file."; };
    img.src = originalURL;
  });
  function clearResult() {
    cleanURL(outputURL); outputURL = null; outputBlob = null;
    if (results) results.hidden = true;
  }
  resetBtn.addEventListener("click", () => {
    input.value = ""; originalFile = null;
    cleanURL(originalURL); originalURL = null; clearResult();
    settings.hidden = true; status.textContent = "Choose an image to begin.";
    maxWidth.value = ""; maxHeight.value = "";
  });
  compressBtn.addEventListener("click", async () => {
    if (!originalFile) { status.textContent = "Choose an image first."; return; }
    clearResult(); compressBtn.disabled = true; compressBtn.textContent = "Processing…";
    try {
      const img = new Image();
      const loaded = new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("Unable to decode image.")); });
      img.src = originalURL; await loaded;
      const readLimit = (field, original) => {
        const raw = field.value.trim();
        if (!raw) return original;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 1 || value > 12000) throw new Error("Dimensions must be between 1 and 12,000 pixels.");
        return Math.floor(value);
      };
      const mw = readLimit(maxWidth, img.naturalWidth), mh = readLimit(maxHeight, img.naturalHeight);
      const ratio = Math.min(1, mw / img.naturalWidth, mh / img.naturalHeight);
      const w = Math.max(1, Math.round(img.naturalWidth * ratio)), h = Math.max(1, Math.round(img.naturalHeight * ratio));
      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      if (format.value === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0, w, h);
      const qualityValue = Number(quality.value) / 100;
      outputBlob = await new Promise((resolve) => canvas.toBlob(resolve, format.value, qualityValue));
      if (!outputBlob) throw new Error("Your browser could not create this output format. Try WebP or JPEG.");
      outputURL = URL.createObjectURL(outputBlob);
      $("newPreview").src = outputURL;
      $("newSize").textContent = bytes(outputBlob.size);
      const delta = originalFile.size - outputBlob.size;
      $("savedSize").textContent = delta >= 0 ? `${((delta / originalFile.size) * 100).toFixed(1)}% smaller` : `${((Math.abs(delta) / originalFile.size) * 100).toFixed(1)}% larger`;
      $("resultNote").textContent = `Output dimensions: ${w} × ${h}px. ${delta >= 0 ? "The new file is smaller than the original." : "This conversion increased the file size; try another format or dimensions."}`;
      const ext = format.value === "image/jpeg" ? "jpg" : format.value === "image/png" ? "png" : "webp";
      $("downloadBtn").href = outputURL; $("downloadBtn").download = `image-reduced.${ext}`;
      results.hidden = false;
      status.textContent = "Processing complete. Check the preview before downloading.";
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    } finally {
      compressBtn.disabled = false; compressBtn.textContent = "Compress image";
    }
  });
  const year = $("year"); if (year) year.textContent = new Date().getFullYear();
  const menu = document.querySelector(".menu-toggle"), links = $("nav-links");
  menu?.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  window.addEventListener("beforeunload", () => { cleanURL(originalURL); cleanURL(outputURL); });
})();