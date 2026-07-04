import { useEffect } from "react";
import { useDeviceStream } from "./hooks/useDeviceStream";

function App() {
  const stream = useDeviceStream();

  useEffect(() => {
    console.log("LumaWarden stream state", stream);
  }, [stream]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section
        className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8"
        aria-label="LumaWarden dashboard"
      >
        <div className="flex flex-1 items-center justify-center">
          <h1 className="text-2xl font-semibold tracking-normal text-slate-100">
            LumaWarden
          </h1>
        </div>
      </section>
    </main>
  );
}

export default App;
