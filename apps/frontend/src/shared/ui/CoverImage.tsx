import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  ariaHidden?: boolean;
  /** Encoder quality (next/image default is 75). Worth raising for hero-sized art. */
  quality?: number;
};

export function CoverImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  ariaHidden = false,
  quality,
}: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      loading={priority ? undefined : "lazy"}
      className={className}
      aria-hidden={ariaHidden || undefined}
    />
  );
}
