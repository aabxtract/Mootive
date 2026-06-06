const SPLASH_LOGO = '/Artboard 1 copy 4 (1).png';

export default function SplashScreen() {
  return (
    <div className="screen-height overflow-hidden bg-white text-black">
      <main className="app-shell-height mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-white shadow-xl sm:my-4 sm:rounded-lg sm:border sm:border-black/10">
        <section className="mootive-fade-in flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center min-[380px]:px-8">
          <div className="relative grid h-28 w-28 place-items-center rounded-lg border border-black/10 bg-white shadow-lg min-[380px]:h-36 min-[380px]:w-36">
            <img src={SPLASH_LOGO} alt="Mootive logo" className="h-20 w-20 object-contain min-[380px]:h-24 min-[380px]:w-24" />
          </div>

          <h1 className="mt-6 text-3xl font-black text-black min-[380px]:mt-8 min-[380px]:text-4xl">Mootive</h1>
          <p className="mt-3 max-w-72 text-base font-semibold leading-7 text-black/70">
            Fast-track your deliveries, reliably and cheaply.
          </p>

          <div className="mt-8 h-1.5 w-36 overflow-hidden rounded-full bg-black/10 min-[380px]:mt-10">
            <div className="mootive-progress h-full rounded-full bg-[#FF5600]" />
          </div>
        </section>
      </main>
    </div>
  );
}
