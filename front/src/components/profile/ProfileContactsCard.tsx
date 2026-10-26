import { useState } from "react";
import { Check, Mail, Pencil, Phone, X } from "lucide-react";

type Props = {
  phone: string;
  email: string;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
};

type EditingField = "phone" | "email" | null;

export default function ProfileContactsCard({
  phone,
  email,
  onPhoneChange,
  onEmailChange,
}: Props) {
  const [editing, setEditing] = useState<EditingField>(null);
  const [draft, setDraft] = useState("");

  function startEdit(field: EditingField, value: string) {
    setEditing(field);
    setDraft(value);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  function saveEdit() {
    if (editing === "phone") {
      onPhoneChange(draft);
    } else if (editing === "email") {
      onEmailChange(draft);
    }
    cancelEdit();
  }

  const items: {
    key: string;
    icon: typeof Phone;
    value: string;
    editable: boolean;
    field: EditingField;
  }[] = [
    {
      key: "phone",
      icon: Phone,
      value: phone,
      editable: true,
      field: "phone",
    },
    {
      key: "email",
      icon: Mail,
      value: email,
      editable: true,
      field: "email",
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Контакты</h2>
      </div>

      <ul className="divide-y divide-gray-50">
        {items.map((item) => {
          const isEditing = editing === item.field;

          return (
            <li
              key={item.key}
              className="flex items-start justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                {isEditing ? (
                  <input
                    type={item.field === "email" ? "email" : "tel"}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:border-[#1a5c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/10"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm text-gray-700">{item.value}</span>
                )}
              </div>

              {item.editable && (
                <div className="flex shrink-0 items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="rounded-md p-1 text-[#1a5c3a] transition-colors hover:bg-[#e8f5ee]"
                        aria-label="Сохранить"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Отменить"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(item.field, item.value)}
                      className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
                      aria-label="Редактировать"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
