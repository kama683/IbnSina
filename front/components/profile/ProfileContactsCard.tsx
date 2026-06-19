import { Mail, MapPin, Pencil, Phone } from "lucide-react";
import { doctorProfile } from "@/lib/mock-data";

const items = [
  {
    icon: Phone,
    value: doctorProfile.contacts.phone,
    editable: true,
  },
  {
    icon: Mail,
    value: doctorProfile.contacts.email,
    editable: true,
  },
  {
    icon: MapPin,
    value: doctorProfile.contacts.workplace,
    editable: false,
  },
];

export default function ProfileContactsCard() {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Контакты</h2>
      </div>

      <ul className="divide-y divide-gray-50">
        {items.map((item) => (
          <li
            key={item.value}
            className="flex items-start justify-between gap-3 px-5 py-3.5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span className="text-sm text-gray-700">{item.value}</span>
            </div>
            {item.editable && (
              <button
                type="button"
                className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Редактировать"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
