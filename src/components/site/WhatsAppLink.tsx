import { whatsappHref } from "@/lib/whatsapp";

export function WhatsAppLink({
  phone,
  message,
  children,
  className,
}: {
  phone: string;
  message?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={whatsappHref(phone, message)}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
