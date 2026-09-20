import { MessageCircle } from "lucide-react";

interface WhatsAppFloatProps {
  settings: Record<string, string>;
}

/** Floating WhatsApp chat button with a subtle pulse ring. */
export default function WhatsAppFloat({ settings }: WhatsAppFloatProps) {
  const number = settings.whatsapp?.replace(/\D/g, "") || "";
  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className="animate-pulse-ring absolute inset-0 rounded-full bg-green-500"
      />
      <MessageCircle className="relative size-6" aria-hidden="true" />
    </a>
  );
}
