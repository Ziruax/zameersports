"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  ExternalLink,
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Send,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import SectionHeading from "../SectionHeading";
import { useSettings, waDisplay, waLink } from "@/hooks/use-checkout";
import { api } from "@/lib/api";

/* -------------------------------------------------------------- contact */

const SUBJECTS = [
  "Order Support",
  "Product Inquiry",
  "Wholesale",
  "Trophy & Engraving",
  "Other",
] as const;

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  phone: z
    .string()
    .trim()
    .regex(/^$|^[0-9+\-\s]{10,15}$/, "Enter a valid phone number (10-15 digits)"),
  subject: z.enum(SUBJECTS),
  message: z.string().trim().min(5, "Please write a short message").max(2000),
});

type ContactValues = z.infer<typeof contactSchema>;

interface InfoCardProps {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  href?: string;
  external?: boolean;
}

function InfoCard({ Icon, label, value, sub, href, external }: InfoCardProps) {
  const content = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50">
        <Icon className="size-5 text-emerald-700" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">{label}</p>
        <p className="mt-0.5 truncate font-semibold text-neutral-900">{value}</p>
        <p className="text-sm text-neutral-500">{sub}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-5">
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="flex w-full items-start gap-4"
            aria-label={`${label}: ${value}`}
          >
            {content}
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-4 p-5">{content}</CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ view */

export default function ContactView() {
  const settings = useSettings();

  useEffect(() => {
    document.title = "Contact Us | Zameer Sports";
  }, []);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "Order Support",
      message: "",
    },
  });

  const [sending, setSending] = useState(false);

  const onSubmit = async (values: ContactValues) => {
    setSending(true);
    try {
      await api("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          subject: values.subject,
          message: values.message,
        }),
      });
      toast.success("Message sent! We'll get back to you soon.");
      form.reset();
    } catch {
      toast.error("Message could not be sent — please WhatsApp or call us instead.");
    } finally {
      setSending(false);
    }
  };

  const socials: { label: string; note: string; href: string; Icon: LucideIcon }[] = [
    {
      label: "Facebook — Main Page",
      note: "zameersports49",
      href: settings.facebook1,
      Icon: Facebook,
    },
    {
      label: "Facebook — Sports Page",
      note: "ZameerSports",
      href: settings.facebook2,
      Icon: Facebook,
    },
    { label: "TikTok", note: "@zameersports", href: settings.tiktok, Icon: Music2 },
    { label: "Instagram", note: "@zameer.sports", href: settings.instagram, Icon: Instagram },
    {
      label: "YouTube",
      note: "@zameersportsofficial804",
      href: settings.youtube,
      Icon: Youtube,
    },
  ];

  const waHref = waLink(settings.whatsapp, "Assalam-o-Alaikum! I have a question for Zameer Sports");

  return (
    <section className="container py-8 sm:py-12" aria-label="Contact Zameer Sports">
      <SectionHeading eyebrow="Get in touch" title="Contact Zameer Sports" />

      {/* info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          Icon={Phone}
          label="Phone"
          value={settings.phone}
          sub="Call us"
          href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}
        />
        <InfoCard
          Icon={MessageCircle}
          label="WhatsApp"
          value={waDisplay(settings.whatsapp)}
          sub="Fastest reply"
          href={waLink(settings.whatsapp)}
          external
        />
        <InfoCard Icon={MapPin} label="Address" value={settings.address} sub="Kolian Road, Board Chowk, Dinga" />
        <InfoCard Icon={Clock} label="Hours" value={settings.hours} sub="Open daily" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl uppercase tracking-wide">
              Send Us a Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoComplete="name"
                            placeholder="Your name"
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Phone{" "}
                          <span className="font-normal text-neutral-400">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="03XXXXXXXXX"
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email <span className="font-normal text-neutral-400">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 w-full" aria-label="Subject">
                              <SelectValue placeholder="Choose a topic" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUBJECTS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder="How can we help? Share product names, order numbers or your requirements."
                          className="min-h-11 resize-y"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={sending}
                  className="h-12 w-full bg-emerald-700 text-base font-bold text-white hover:bg-emerald-800 sm:w-auto sm:px-8"
                >
                  <Send className="size-5" aria-hidden="true" />
                  {sending ? "Sending…" : "Send Message"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* socials */}
        <Card className="self-start">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl uppercase tracking-wide">
              Connect With Us
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-2">
              {socials.map(({ label, note, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-neutral-100 px-4 py-2.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <Icon className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-neutral-900">{label}</span>
                      <span className="block truncate text-sm text-neutral-500">{note}</span>
                    </span>
                    <ExternalLink
                      className="size-4 shrink-0 text-neutral-400"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-sm text-neutral-500">
              We usually reply within a few hours during store hours.
            </p>
            <Button asChild className="h-12 w-full gap-2 bg-emerald-700 text-base font-bold text-white hover:bg-emerald-800">
              <a href={waHref} target="_blank" rel="noreferrer">
                <MessageCircle className="size-5" aria-hidden="true" />
                Chat on WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
