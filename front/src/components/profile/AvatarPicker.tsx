import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { EMPLOYEE_QUERY_KEY } from "@/lib/auth/employee-context";
import { deleteMyAvatar, uploadMyAvatar } from "@/lib/api/employees";
import { MAX_AVATAR_BYTES, prepareAvatar } from "@/lib/avatar-image";

type Props = {
  initials: string;
  avatarUrl: string | null;
  /** Размер аватарки классами, например "h-20 w-20 text-2xl". */
  className: string;
};

/** Аватарка с кнопками «Изменить фото» / «Удалить фото». Загрузка сразу
 * уходит на сервер, не дожидаясь «Сохранить изменения» формы профиля. */
export default function AvatarPicker({ initials, avatarUrl, className }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(action: () => Promise<{ avatarUrl: string | null }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      setUrl(result.avatarUrl);
      // Сайдбар берёт аватарку из сессии. Запросы страницы не трогаем:
      // не перезагружаем профиль, чтобы не потерять несохранённые правки формы.
      await queryClient.invalidateQueries({ queryKey: EMPLOYEE_QUERY_KEY });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить фото");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Выберите изображение (JPEG, PNG или WebP)");
      return;
    }
    await apply(async () => {
      const blob = await prepareAvatar(file);
      if (blob.size > MAX_AVATAR_BYTES) {
        throw new Error("Файл больше 5 МБ");
      }
      return uploadMyAvatar(blob);
    });
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar url={url} initials={initials} className={className} />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 disabled:opacity-50"
          aria-label="Изменить фото"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          data-testid="avatar-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = ""; // тот же файл можно выбрать повторно
            if (file) void handleFile(file);
          }}
        />
      </div>

      {url && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void apply(deleteMyAvatar)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          Удалить фото
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 max-w-[240px] text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
