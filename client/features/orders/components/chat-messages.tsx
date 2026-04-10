/* eslint-disable @next/next/no-img-element */
import { ZoomIn } from "lucide-react";

export function ChatMessages() {
  return (
    <div className="flex-1 space-y-8 overflow-y-auto p-8 pb-32 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex justify-center">
        <span className="rounded-full border border-border/10 bg-secondary/5 px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Order Started • Jan 24, 2024
        </span>
      </div>

      <div className="ml-auto flex max-w-[80%] flex-col items-end gap-2">
        <div className="rounded-2xl rounded-tr-none border border-primary/20 bg-primary/10 p-4 text-sm leading-relaxed text-foreground">
          Hi Ananya! Just confirmed the payment for the Brand Storyteller
          package. Super excited to get started on the{" "}
          <span className="font-semibold italic text-primary">
            Prism Essence Mask
          </span>{" "}
          campaign!
        </div>
        <span className="px-1 text-[10px] text-muted-foreground">
          10:15 AM • Read
        </span>
      </div>

      <div className="flex max-w-[80%] flex-col items-start gap-2">
        <div className="flex items-end gap-3">
          <img
            alt="Ananya"
            className="h-6 w-6 rounded-full"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIriTU-ZrG1bpzgvTxulg4C909ZEBpWV1mx4Lc4hCclV-9uk846cn86vvr7Xe_IeG3I0aL8uR_9m1iGAd3koNpxJcTk6cWqpbFfVa94IiqbaS7nq6DtGG4a-WtjcdQSBp9748TlROoOJ26gWitxnhs6l4Qsuu8Pc6447tp9JOzuAxpSYOK1yq5riwsVypWaKT_Cbdk3DkK6slKfwgCgjkSCNbdzfJAiER7lOYwIoz1dvmJMCEuibPwB964lhS1oOr10Iy0Db5RV28"
          />
          <div className="rounded-2xl rounded-tl-none bg-background/50 border border-border/10 p-4 text-sm leading-relaxed text-foreground shadow-sm">
            Hey Arjun! Thank you so much. I&apos;ve already started mapping out the
            narrative. For the mask application shot, I was thinking of using a
            high-key lighting setup with a subtle violet rim light to match the
            Etheric Prism brand identity. What do you think?
          </div>
        </div>
        <span className="ml-9 text-[10px] text-muted-foreground">10:18 AM</span>
      </div>

      {/* Message From Arjun (Brand) */}
      <div className="ml-auto flex max-w-[80%] flex-col items-end gap-2">
        <div className="rounded-2xl rounded-tr-none border border-primary/20 bg-primary/10 p-4 text-sm leading-relaxed text-foreground">
          Love that idea. The violet rim light will definitely make the
          packaging pop. I&apos;ve attached the moodboard frames for the lighting
          reference we used in our last studio shoot. Let me know if that works!
        </div>
        <div className="mt-2 grid w-64 grid-cols-2 gap-2">
          <div className="group relative aspect-square overflow-hidden rounded-xl border border-border/50">
            <img
              alt="Moodboard 1"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZo1yviHUrSzM1oUckBEtWylfiKHAi8Fo15fSOLXCBteyG03xOTocYzq3fEDyN-FMniQc_6Rx_WPEg9lImeu-psP-_AmiSayOqnQh8zs9owYTU38xgyZGfgaFNSNTaN76SIL7buq30zCNz12bSoefkpfC-jC8rqYYSZJRMeBkE9EwwM6UE75HS2KzSUosmEuR1D3eYdKtS9iffXcN5mx9m6vW5ubIUQkCc4IkH7ow1HW0MedFe-wDrcW_jXaCY6mYeRamuYbcnDlM"
            />
            <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="text-white" />
            </div>
          </div>
          <div className="group relative aspect-square overflow-hidden rounded-xl border border-border/50">
            <img
              alt="Moodboard 2"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXnHSMLWwsG36xm05kRgvkDH3KKekhj8WpYRR0RV2dj_MGpFOnvTLLSnj1UnBztelwPWhqJRPpWS56PnAlq5uKmZw2QS7OUYHDrVO9OgSVqsF0oDr3lpmXLNMheJAA__fHMnyT3QOJLPu5xZKsrsFALZpNI3bl5TbSB9zFwK86rNNV9VmVSKxkIdeGprBYTaJ18lEG1EzE0gQBYIS5fczErQJwU1IzfqA9qdjZxKCj431ZHf9f74vvq52PS6NByyW9sbI7M-5FnmY"
            />
            <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="text-white" />
            </div>
          </div>
        </div>
        <span className="px-1 text-[10px] text-muted-foreground">10:22 AM</span>
      </div>

      <div className="flex max-w-[80%] flex-col items-start gap-2">
        <div className="flex items-end gap-3">
          <img
            alt="Ananya"
            className="h-6 w-6 rounded-full"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvKcbtjYkVUfAxHV1r6KRGLr22iwYfmZlqAyxILR6pKC8OLVN7jnWEWxFwLqO-QeKfWBy9-gDdWcA-uBZHYOWuzwPLsCTq4Y34rbyeBVj5Boqzp39NwEuR89OJ2k4-t4CGciAGrdCHvVyU2G2CW5XavUqmfk1gX77_eKxhAZ5ARIJ3EFMvBiQ1N3P7KtigpRI1OEbNp05Ypw_k55TAVp6hwW8SSnqj08v-W7faPrkKfyTXMXRKjEPmfn5IXafhkxMkGyPmHRw5O4I"
          />
          <div className="rounded-2xl rounded-tl-none bg-background/50 border border-border/10 p-4 text-sm italic leading-relaxed text-foreground shadow-sm">
            Ananya is typing...
          </div>
        </div>
      </div>
    </div>
  );
}
