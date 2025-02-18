import Observations from "@/components/observations";
import Thoughts from "@/components/thoughts";
import Main from "@/components/main";

export default function Home() {
  return (
    <main className="w-auto h-screen overflow-hidden">
      <header className="bg-white border-b-2">
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-4" aria-label="Global">
          <div className="flex lg:flex-1">
            <a href="#" className="-m-1.5 p-1.5">
              <h1 className="font-bold">Hybrid QA</h1>
            </a>
          </div>
          {/* <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <a href="#" className="text-sm font-semibold leading-6 text-gray-900">See example  <span aria-hidden="true">&rarr;</span></a>
          </div> */}
        </nav>
      </header>
      <Main />
    </main>
  )
}
