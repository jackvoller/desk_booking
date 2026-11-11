// Silverfin navy with layered teal waves along the bottom, after the brand slide style.
// Sits fixed behind the page so content scrolls over it; `contained` fills its parent instead.
function BrandBackground({ contained = false }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none inset-0 overflow-hidden bg-sfNavy ${contained ? 'absolute' : 'fixed -z-10'}`}
    >
      <svg
        className={`absolute inset-x-0 bottom-0 w-full ${contained ? 'h-[70%]' : 'h-[46vh] min-h-[260px]'}`}
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
      >
        <path d="M0 170 C 320 60 700 70 1040 130 S 1360 150 1440 70 L1440 400 L0 400 Z" fill="#0A7791" opacity="0.9" />
        <path d="M0 220 C 260 150 560 330 940 255 S 1300 150 1440 190 L1440 400 L0 400 Z" fill="#14BAD7" opacity="0.8" />
        <path d="M0 265 C 240 305 520 215 840 238 S 1270 305 1440 280 L1440 400 L0 400 Z" fill="#1AA0B8" opacity="0.75" />
        <path d="M0 300 C 400 240 820 262 1110 318 S 1385 300 1440 250 L1440 400 L0 400 Z" fill="#57C0CA" opacity="0.45" />
        <path d="M0 335 C 360 385 720 300 1080 340 S 1400 382 1440 362 L1440 400 L0 400 Z" fill="#036483" opacity="0.95" />
      </svg>
    </div>
  );
}

export default BrandBackground;
