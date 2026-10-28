/** Лимит бэкенда (MAX_AVATAR_BYTES) — крупнее файл не принимается. */
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const AVATAR_SIZE = 512;

/** Готовит файл к загрузке: обрезает по центру до квадрата и ужимает до
 * 512×512 JPEG — аватарка показывается маленькой, фото с телефона в 5+ МБ
 * грузить незачем. Если браузер не умеет декодировать/рисовать (или файл не
 * картинка), отдаёт исходный файл — окончательную проверку делает сервер. */
export async function prepareAvatar(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // белая подложка — у PNG с прозрачностью в JPEG иначе будет чёрный фон
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
