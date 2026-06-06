const SPLASH_LOGO = '/Artboard 1 copy 4 (1).png';

export default function SplashScreen() {
  return (
    <div className="min-h-screen bg-white text-black">
      <main className="mx-auto flex h-screen w-full max-w-[430px] flex-col overflow-hidden bg-white shadow-xl sm:my-4 sm:h-[calc(100vh-2rem)] sm:rounded-lg sm:border sm:border-black/10">
        <section className="mootive-fade-in flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="relative grid h-36 w-36 place-items-center rounded-lg border border-black/10 bg-white shadow-lg">
            <img src={SPLASH_LOGO} alt="Mootive logo" className="h-24 w-24 object-contain" />
          </div>

          <h1 className="mt-8 text-4xl font-black text-black">Mootive</h1>
          <p className="mt-3 max-w-72 text-base font-semibold leading-7 text-black/70">
            Fast-track your deliveries, reliably and cheaply.
          </p>

          <div className="mt-10 h-1.5 w-36 overflow-hidden rounded-full bg-black/10">
            <div className="mootive-progress h-full rounded-full bg-[#FF5600]" />
          </div>
        </section>
      </main>
    </div>
  );
}
