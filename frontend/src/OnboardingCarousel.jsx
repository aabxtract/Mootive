import { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';

const LOGO = '/Artboard 1 copy 5.png';

const SLIDES = [
  {
    image: '/Logistics-rafiki.svg',
    title: 'Send packages easily',
    description: 'Create delivery requests in seconds and connect with available drivers near you.',
  },
  {
    image: '/Order ride-pana.svg',
    title: 'Find reliable drivers',
    description: 'Compare available drivers, view trust signals, and get smart recommendations before sending.',
  },
  {
    image: '/Growth analytics-pana.svg',
    title: 'Track and confirm delivery',
    description: 'Follow delivery progress from pickup to drop-off, then let the receiver confirm when it arrives.',
  },
];

export default function OnboardingCarousel({ onComplete, onReset, showReset = false }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const isLastSlide = activeSlide === SLIDES.length - 1;

  function handleNext() {
    if (isLastSlide) {
      onComplete();
      return;
    }
    setActiveSlide((current) => Math.min(current + 1, SLIDES.length - 1));
  }

  return (
    <div className="min-h-screen bg-[#e8edf3] text-slate-950">
      <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col overflow-hidden bg-[linear-gradient(160deg,#ffffff_0%,#f4fbf8_48%,#eef2ff_100%)] shadow-xl sm:my-4 sm:h-[calc(100vh-2rem)] sm:rounded-lg sm:border sm:border-white/80">
        <header className="flex items-center justify-between px-5 pb-2 pt-5">
          <img src={LOGO} alt="Mootive" className="h-10 w-10 object-contain opacity-90" />
          <button
            type="button"
            onClick={onComplete}
            className="rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-sm font-black text-slate-700 shadow-sm"
          >
            Skip
          </button>
        </header>

        <section className="min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {SLIDES.map((slide) => (
              <article key={slide.title} className="flex h-full w-full shrink-0 flex-col items-center justify-center px-7 text-center">
                <div className="flex h-64 w-full items-center justify-center rounded-lg border border-white/80 bg-white/70 p-4 shadow-sm">
                  <img src={slide.image} alt="" className="max-h-full w-full object-contain" />
                </div>
                <h1 className="mt-9 text-3xl font-black leading-tight text-slate-950">{slide.title}</h1>
                <p className="mt-4 max-w-80 text-base font-semibold leading-7 text-slate-600">{slide.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="space-y-5 px-5 pb-7 pt-4">
          <div className="flex justify-center gap-2">
            {SLIDES.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-slate-950' : 'w-2.5 bg-slate-300'}`}
                aria-label={`Go to onboarding slide ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-black text-white shadow-sm"
          >
            <span>{isLastSlide ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {showReset && (
            <button
              type="button"
              onClick={onReset}
              className="mx-auto flex items-center gap-2 text-xs font-bold text-slate-500"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset onboarding
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}
