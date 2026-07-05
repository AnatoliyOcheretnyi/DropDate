import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  ariaHidden?: boolean;
};

export function CoverImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  ariaHidden = false,
}: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={className}
      aria-hidden={ariaHidden || undefined}
    />
  );
}
