import { requireDb, result, supabase } from "./api";
export async function prepareImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose JPEG, PNG or WebP images.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("Each image must be 8 MB or smaller.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > 60000000) {
    bitmap.close();
    throw new Error("Image dimensions are too large. Please resize it first.");
  }
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  if (!blob) throw new Error("Could not process this image.");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
    type: "image/webp",
  });
}
export async function uploadImage(file, path, onProgress) {
  const {
    data: { session },
    error,
  } = await requireDb().auth.getSession();
  if (error || !session) throw new Error("Please sign in again.");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/product-images/${path}`,
    );
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader(
      "apikey",
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    );
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("Cache-Control", "600");
    xhr.timeout = 120000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection and try again."));
    xhr.ontimeout = () =>
      reject(new Error("Upload timed out. Please try again."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(path);
      else
        reject(
          new Error(
            "Upload failed. Your session or storage permissions may need attention.",
          ),
        );
    };
    xhr.send(file);
  });
}
export async function removeUnusedImages(paths) {
  for (const path of [...new Set(paths.filter(Boolean))]) {
    const rows = await result(
      requireDb()
        .from("product_images")
        .select("id")
        .eq("storage_path", path)
        .limit(1),
    );
    if (!rows.length) {
      const { error } = await supabase.storage
        .from("product-images")
        .remove([path]);
      if (error) throw error;
    }
  }
}
